import mongoose from "mongoose";
import { parse } from "csv-parse/sync";
import Drive from "../models/Drive.js";
import Application from "../models/Application.js";
import User from "../models/User.js";
import ApiError from "../utils/apiError.js";

// Mongo transactions require a replica-set deployment (true for MongoDB
// Atlas; false for a bare standalone `mongod`). Where unsupported, we fall
// back to running the same operations without a session — the processedAt /
// status guards inside each operation still prevent duplicate application,
// just without cross-collection atomicity.
const TRANSACTIONS_UNSUPPORTED = /Transaction numbers are only allowed on a replica set member or mongos|IllegalOperation/i;

const withOptionalTransaction = async (run) => {
  let session;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await run(session);
    });
    return result;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (!TRANSACTIONS_UNSUPPORTED.test(err?.message || "")) throw err;
    return run(null);
  } finally {
    if (session) session.endSession();
  }
};

// ─── CSV parsing ────────────────────────────────────────────────────────────
// Canonical format: a single required "rollNumber" column (case-insensitive
// exact header match — no alias fuzzing for roll_no/roll no/etc). Any other
// columns (name, email) are read but ignored.
export const parseCsv = (buffer) => {
  let records;
  try {
    records = parse(buffer, {
      columns: true,
      trim: true,
      skip_empty_lines: true,
      bom: true,
    });
  } catch (err) {
    throw new ApiError(400, "Could not parse the uploaded CSV file.");
  }

  if (!records.length) return [];

  const headerKey = Object.keys(records[0]).find(
    (key) => key.trim().toLowerCase() === "rollnumber",
  );
  if (!headerKey) {
    throw new ApiError(400, 'CSV must contain a "rollNumber" column.');
  }

  return records
    .map((row) => (row[headerKey] || "").toString().trim().toUpperCase())
    .filter((value) => value.length > 0);
};

// ─── Preview / validation ───────────────────────────────────────────────────
// Cross-references the raw roll-number list against User and Application,
// splitting failures into distinct, actionable buckets. Pure read — never
// mutates anything. Reused as-is by confirmShortlist to re-validate fresh
// against live DB state rather than trusting the client's earlier preview.
export const buildPreview = async (driveId, rawRollNumbers) => {
  const totalRows = rawRollNumbers.length;

  const seen = new Set();
  const duplicateSet = new Set();
  const uniqueRollNumbers = [];
  for (const rollNumber of rawRollNumbers) {
    if (seen.has(rollNumber)) {
      duplicateSet.add(rollNumber);
    } else {
      seen.add(rollNumber);
      uniqueRollNumbers.push(rollNumber);
    }
  }

  const users = await User.find({ rollNumber: { $in: uniqueRollNumbers } })
    .select("_id rollNumber")
    .lean();
  const userIdByRoll = new Map(users.map((u) => [u.rollNumber, u._id]));

  const unknownRollNumbers = uniqueRollNumbers.filter(
    (rn) => !userIdByRoll.has(rn),
  );
  const knownRollNumbers = uniqueRollNumbers.filter((rn) =>
    userIdByRoll.has(rn),
  );

  const applications = await Application.find({
    drive: driveId,
    student: { $in: knownRollNumbers.map((rn) => userIdByRoll.get(rn)) },
  })
    .select("student status")
    .lean();
  const appByStudentId = new Map(
    applications.map((a) => [String(a.student), a]),
  );

  const neverAppliedRollNumbers = [];
  const alreadyTerminalRollNumbers = [];
  const validRollNumbers = [];

  for (const rollNumber of knownRollNumbers) {
    const studentId = String(userIdByRoll.get(rollNumber));
    const application = appByStudentId.get(studentId);
    if (!application) {
      neverAppliedRollNumbers.push(rollNumber);
    } else if (application.status !== "active") {
      alreadyTerminalRollNumbers.push(rollNumber);
    } else {
      validRollNumbers.push(rollNumber);
    }
  }

  return {
    totalRows,
    validRollNumbers,
    validCount: validRollNumbers.length,
    duplicateRollNumbers: [...duplicateSet],
    unknownRollNumbers,
    neverAppliedRollNumbers,
    alreadyTerminalRollNumbers,
  };
};

// ─── Shortlist confirmation ─────────────────────────────────────────────────
// Only ever touches Application documents for the current round plus that
// round's own processedAt flag — never Drive.rounds membership or
// currentRoundId. The processedAt guard (not just status:"active" filtering)
// is what actually prevents duplicate/concurrent processing: shortlisted
// candidates stay "active", so a repeated call would otherwise re-match them.
export const applyShortlist = async (driveId, roundId, { rollNumbers, actorId }) => {
  // Re-validate fresh against live DB state — never trust the caller's
  // earlier preview.
  const preview = await buildPreview(driveId, rollNumbers);
  const shortlistedUsers = await User.find({
    rollNumber: { $in: preview.validRollNumbers },
  })
    .select("_id")
    .lean();
  const shortlistedStudentIds = shortlistedUsers.map((u) => u._id);
  const shortlistedIdSet = new Set(shortlistedStudentIds.map(String));

  const run = async (session) => {
    const opts = session ? { session } : {};
    const now = new Date();

    const flip = await Drive.updateOne(
      { _id: driveId, "rounds._id": roundId, "rounds.processedAt": null },
      { $set: { "rounds.$.processedAt": now } },
      opts,
    );
    if (flip.modifiedCount !== 1) {
      throw new ApiError(409, "This round's shortlist has already been processed.");
    }

    // Snapshot who's still active (and therefore about to be rejected)
    // inside the same transaction, so the notification fan-out list is
    // consistent with what actually gets written below.
    const activeApplications = await Application.find(
      { drive: driveId, status: "active" },
      { student: 1 },
      opts,
    ).lean();
    const rejectedStudentIds = activeApplications
      .map((a) => a.student)
      .filter((id) => !shortlistedIdSet.has(String(id)));

    await Application.bulkWrite(
      [
        {
          updateMany: {
            filter: {
              drive: driveId,
              status: "active",
              student: { $in: shortlistedStudentIds },
            },
            update: {
              $push: {
                timeline: {
                  status: "active",
                  note: "Shortlisted to continue to the next stage.",
                  roundId,
                  updatedBy: actorId,
                  changedAt: now,
                },
              },
            },
          },
        },
        {
          updateMany: {
            filter: {
              drive: driveId,
              status: "active",
              student: { $nin: shortlistedStudentIds },
            },
            update: {
              $set: { status: "rejected" },
              $push: {
                timeline: {
                  status: "rejected",
                  note: "Not shortlisted for the next stage.",
                  roundId,
                  updatedBy: actorId,
                  changedAt: now,
                },
              },
            },
          },
        },
      ],
      opts,
    );

    return { shortlistedStudentIds, rejectedStudentIds };
  };

  return withOptionalTransaction(run);
};

// ─── Finish drive ───────────────────────────────────────────────────────────
// No CSV — the narrowing already happened via the last confirmShortlist.
// Promotes whoever is still "active" to "selected" and marks the drive
// completed, in the same transaction (never one without the other).
export const finishDrive = async (driveId, currentRoundId, actorId) => {
  const run = async (session) => {
    const opts = session ? { session } : {};
    const now = new Date();

    const flip = await Drive.updateOne(
      { _id: driveId, status: "active" },
      { $set: { status: "completed" } },
      opts,
    );
    if (flip.modifiedCount !== 1) {
      throw new ApiError(409, "This drive is no longer active.");
    }

    const result = await Application.find(
      { drive: driveId, status: "active" },
      { student: 1 },
      opts,
    ).lean();
    const selectedStudentIds = result.map((a) => a.student);

    await Application.updateMany(
      { drive: driveId, status: "active" },
      {
        $set: { status: "selected" },
        $push: {
          timeline: {
            status: "selected",
            note: "Drive finalized — selected.",
            roundId: currentRoundId,
            updatedBy: actorId,
            changedAt: now,
          },
        },
      },
      opts,
    );

    return { selectedStudentIds };
  };

  return withOptionalTransaction(run);
};
