import { parse } from "csv-parse/sync";
import RosterEntry from "../models/RosterEntry.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import ApiError from "../utils/apiError.js";
import escapeRegex from "../utils/escapeRegex.js";
import { withTransaction } from "../utils/transaction.js";

// The roster is the authoritative student list (see models/RosterEntry.js).
// Who may change what:
//   superadmin            — import rows, change `year`
//   placementCoordinator  — change `cgpa` / `backlogs` (placement-owned data)
// Identity/cohort fields (rollNumber, email, branch, batch, section) of a
// CLAIMED entry are never editable here.

const REQUIRED_COLUMNS = [
  "rollNumber",
  "email",
  "firstName",
  "lastName",
  "branch",
  "batch",
  "section",
  "year",
];
const OPTIONAL_COLUMNS = ["cgpa", "backlogs"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── validation helpers (shared by import and PATCH) ──────────────────────────
// Each returns { value } or { error }. Blank / null clears the value ("not on
// file"), which is distinct from 0.
const parseCgpa = (raw) => {
  if (raw === null || raw === undefined || raw === "") return { value: null };
  const n = Number(raw);
  if (typeof raw === "boolean" || !Number.isFinite(n) || n < 0 || n > 10) {
    return { error: "cgpa must be a number between 0 and 10" };
  }
  return { value: n };
};
const parseBacklogs = (raw) => {
  if (raw === null || raw === undefined || raw === "") return { value: null };
  const n = Number(raw);
  if (typeof raw === "boolean" || !Number.isInteger(n) || n < 0) {
    return { error: "backlogs must be a whole number of 0 or more" };
  }
  return { value: n };
};
const parseYear = (raw) => {
  const n = Number(raw);
  if (
    typeof raw === "boolean" ||
    raw === "" ||
    raw === null ||
    ![1, 2, 3, 4].includes(n)
  ) {
    return { error: "year must be 1, 2, 3 or 4" };
  }
  return { value: n };
};

// Normalizes one CSV record into roster fields, or explains why it can't.
const normalizeRow = (record) => {
  const str = (key) => (record[key] ?? "").toString().trim();
  for (const key of REQUIRED_COLUMNS) {
    if (!str(key)) return { error: `${key} is required` };
  }

  const email = str("email").toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "email is not a valid address" };

  const batch = Number(str("batch"));
  if (!Number.isInteger(batch) || batch < 1990 || batch > 2100) {
    return { error: "batch must be an admission year such as 2023" };
  }

  const year = parseYear(str("year"));
  if (year.error) return { error: year.error };
  const cgpa = parseCgpa(str("cgpa"));
  if (cgpa.error) return { error: cgpa.error };
  const backlogs = parseBacklogs(str("backlogs"));
  if (backlogs.error) return { error: backlogs.error };

  return {
    fields: {
      rollNumber: str("rollNumber").toUpperCase(),
      email,
      firstName: str("firstName"),
      lastName: str("lastName"),
      branch: str("branch"),
      batch,
      section: str("section").toUpperCase(),
      year: year.value,
      cgpa: cgpa.value,
      backlogs: backlogs.value,
    },
  };
};

const parseRosterCsv = (buffer) => {
  let records;
  try {
    records = parse(buffer, {
      columns: true,
      trim: true,
      skip_empty_lines: true,
      bom: true,
    });
  } catch {
    throw new ApiError(400, "Could not parse the uploaded CSV file.");
  }
  if (!records.length) throw new ApiError(400, "The CSV file has no rows.");

  // Case-insensitive headers, mapped onto the canonical column names.
  const canonical = new Map(
    [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].map((c) => [c.toLowerCase(), c]),
  );
  const headerMap = {};
  for (const header of Object.keys(records[0])) {
    const name = canonical.get(header.trim().toLowerCase());
    if (name) headerMap[header] = name;
  }
  const missing = REQUIRED_COLUMNS.filter(
    (c) => !Object.values(headerMap).includes(c),
  );
  if (missing.length) {
    throw new ApiError(
      400,
      `CSV is missing required column(s): ${missing.join(", ")}.`,
    );
  }

  return records.map((record) => {
    const mapped = {};
    for (const [header, name] of Object.entries(headerMap))
      mapped[name] = record[header];
    return mapped;
  });
};

// Updates academic fields on a roster entry AND its linked user together, in
// one transaction, so the trusted roster and the User can never diverge.
// `fields` has already been validated. Throws ApiError inside the transaction
// (which aborts it) when either side does not match.
const applyAcademicUpdate = (rollNumber, fields) =>
  withTransaction(async (session) => {
    const entry = await RosterEntry.findOne({ rollNumber })
      .session(session)
      .lean();
    if (!entry)
      throw new ApiError(404, "No roster entry with that roll number.");

    const rosterResult = await RosterEntry.updateOne(
      { _id: entry._id, claimedBy: entry.claimedBy },
      { $set: fields },
      { session, runValidators: true },
    );
    if (rosterResult.matchedCount !== 1) {
      throw new ApiError(
        409,
        "The roster entry changed during the update. Try again.",
      );
    }

    if (entry.claimedBy) {
      const userResult = await User.updateOne(
        { _id: entry.claimedBy },
        { $set: fields },
        { session, runValidators: true },
      );
      if (userResult.matchedCount !== 1) {
        throw new ApiError(
          409,
          "The linked account no longer exists. Contact an administrator.",
        );
      }
    }

    return RosterEntry.findById(entry._id).session(session).lean();
  });

// ─── POST /api/admin/roster/import  (superadmin, CSV) ─────────────────────────
// Every row is validated, and uniqueness of rollNumber and email is checked
// against the file, the roster and existing users BEFORE anything is written,
// so a conflict is reported per row instead of aborting halfway.
export const importRoster = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "A CSV file is required.");
  const records = parseRosterCsv(req.file.buffer);

  const rejected = [];
  const reject = (row, rollNumber, reason) =>
    rejected.push({ row, rollNumber, reason });

  // 1. Per-row validation. `row` is the spreadsheet line (header is line 1).
  let rows = [];
  records.forEach((record, i) => {
    const { fields, error } = normalizeRow(record);
    if (error)
      reject(i + 2, (record.rollNumber ?? "").toString().trim(), error);
    else rows.push({ row: i + 2, fields });
  });

  // 2. Duplicates within the file: reject every copy, since we can't know
  //    which one is right.
  const count = (key) => {
    const counts = new Map();
    for (const { fields } of rows)
      counts.set(fields[key], (counts.get(fields[key]) ?? 0) + 1);
    return counts;
  };
  const rollCounts = count("rollNumber");
  const emailCounts = count("email");
  rows = rows.filter(({ row, fields }) => {
    if (rollCounts.get(fields.rollNumber) > 1) {
      reject(
        row,
        fields.rollNumber,
        "rollNumber appears more than once in this file",
      );
      return false;
    }
    if (emailCounts.get(fields.email) > 1) {
      reject(
        row,
        fields.rollNumber,
        "email appears more than once in this file",
      );
      return false;
    }
    return true;
  });

  // 3. Conflicts with the existing roster and existing users.
  const rolls = rows.map((r) => r.fields.rollNumber);
  const emails = rows.map((r) => r.fields.email);
  const [entries, users] = await Promise.all([
    RosterEntry.find({
      $or: [{ rollNumber: { $in: rolls } }, { email: { $in: emails } }],
    }).lean(),
    User.find({
      $or: [{ rollNumber: { $in: rolls } }, { email: { $in: emails } }],
    })
      .select("_id rollNumber email")
      .lean(),
  ]);
  const entryByRoll = new Map(entries.map((e) => [e.rollNumber, e]));
  const entryByEmail = new Map(entries.map((e) => [e.email, e]));
  const userByRoll = new Map(users.map((u) => [u.rollNumber, u]));
  const userByEmail = new Map(users.map((u) => [u.email, u]));

  const upserts = []; // new or unclaimed entries: roster-only writes
  const claimedUpdates = []; // claimed entries: roster + user, transactional

  for (const { row, fields } of rows) {
    const existing = entryByRoll.get(fields.rollNumber);
    const emailOwner = entryByEmail.get(fields.email);
    if (emailOwner && emailOwner.rollNumber !== fields.rollNumber) {
      reject(
        row,
        fields.rollNumber,
        `email already belongs to roster entry ${emailOwner.rollNumber}`,
      );
      continue;
    }

    // A user holding this email or roll number must be the account this entry
    // belongs to: its linked user, or — before migration — a legacy account
    // with the SAME roll number and email (the migration links those).
    const linkedId = existing?.claimedBy ? String(existing.claimedBy) : null;
    const conflictingUser = [
      userByEmail.get(fields.email),
      userByRoll.get(fields.rollNumber),
    ].find(
      (u) =>
        u &&
        (linkedId
          ? String(u._id) !== linkedId
          : u.rollNumber !== fields.rollNumber || u.email !== fields.email),
    );
    if (conflictingUser) {
      reject(
        row,
        fields.rollNumber,
        "email or rollNumber is already used by a different account",
      );
      continue;
    }

    if (existing?.claimedBy) {
      const identityChanged = ["email", "branch", "batch", "section"].some(
        (key) => existing[key] !== fields[key],
      );
      if (identityChanged) {
        reject(
          row,
          fields.rollNumber,
          "entry is claimed: email and cohort (branch/batch/section) cannot change",
        );
        continue;
      }
      claimedUpdates.push({ row, fields });
    } else {
      upserts.push({ row, fields });
    }
  }

  // 4. New + unclaimed entries in one unordered bulkWrite. The claimedBy:null
  //    filter means an entry claimed in the meantime is not overwritten: the
  //    upsert then collides on rollNumber and is reported as rejected.
  let created = 0;
  let updated = 0;
  if (upserts.length) {
    const ops = upserts.map(({ fields }) => ({
      updateOne: {
        filter: { rollNumber: fields.rollNumber, claimedBy: null },
        update: { $set: fields },
        upsert: true,
      },
    }));
    try {
      const result = await RosterEntry.bulkWrite(ops, { ordered: false });
      created = result.upsertedCount;
      updated = result.matchedCount;
    } catch (err) {
      // Unordered: everything else was written; report the failed rows.
      const writeErrors =
        err.writeErrors ?? err.result?.getWriteErrors?.() ?? [];
      if (!writeErrors.length) throw err;
      for (const we of writeErrors) {
        const { row, fields } = upserts[we.index];
        reject(
          row,
          fields.rollNumber,
          we.code === 11000
            ? "rollNumber or email was taken while importing"
            : "could not be saved",
        );
      }
      created = err.result?.upsertedCount ?? err.result?.nUpserted ?? 0;
      updated = err.result?.matchedCount ?? err.result?.nMatched ?? 0;
    }
  }

  // 5. Claimed entries: academic fields only, roster + user together.
  for (const { row, fields } of claimedUpdates) {
    try {
      await applyAcademicUpdate(fields.rollNumber, {
        year: fields.year,
        cgpa: fields.cgpa,
        backlogs: fields.backlogs,
      });
      updated += 1;
    } catch (err) {
      reject(
        row,
        fields.rollNumber,
        err instanceof ApiError ? err.message : "could not be updated",
      );
      if (!(err instanceof ApiError))
        console.error("[ROSTER] claimed-row update failed:", err);
    }
  }

  rejected.sort((a, b) => a.row - b.row);
  sendResponse(res, 200, "Roster import processed.", {
    created,
    updated,
    rejected,
  });
});

// ─── GET /api/admin/roster  (superadmin) ──────────────────────────────────────
export const listRoster = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

  const query = {};
  const { branch, section, batch, search, claimed } = req.query;
  if (typeof branch === "string" && branch) query.branch = branch;
  if (typeof section === "string" && section)
    query.section = section.toUpperCase();
  if (typeof batch === "string" && Number.isInteger(Number(batch)))
    query.batch = Number(batch);
  if (claimed === "true") query.claimedBy = { $ne: null };
  if (claimed === "false") query.claimedBy = null;
  if (typeof search === "string" && search.trim()) {
    const prefix = new RegExp(`^${escapeRegex(search.trim())}`, "i");
    query.$or = [{ rollNumber: prefix }, { email: prefix }];
  }

  const [entries, total] = await Promise.all([
    RosterEntry.find(query)
      .sort({ branch: 1, batch: 1, section: 1, rollNumber: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    RosterEntry.countDocuments(query),
  ]);

  sendResponse(res, 200, "Roster fetched.", {
    entries,
    pagination: { total, page, pages: Math.ceil(total / limit) },
  });
});

// Rejects any body key outside `allowed`, then validates the rest.
const pickBody = (body, allowed) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Invalid request body.");
  }
  const extra = Object.keys(body).filter((k) => !allowed.includes(k));
  if (extra.length) {
    throw new ApiError(400, `Not allowed to change: ${extra.join(", ")}.`);
  }
  const present = allowed.filter((k) => body[k] !== undefined);
  if (!present.length)
    throw new ApiError(400, `Provide ${allowed.join(" or ")}.`);
  return present;
};

// ─── PATCH /api/admin/roster/students/:rollNumber/academics ───────────────────
// superadmin or placementCoordinator. CGPA and backlogs only.
export const updateAcademics = asyncHandler(async (req, res) => {
  const fields = {};
  for (const key of pickBody(req.body, ["cgpa", "backlogs"])) {
    const { value, error } = (key === "cgpa" ? parseCgpa : parseBacklogs)(
      req.body[key],
    );
    if (error) throw new ApiError(400, error);
    fields[key] = value;
  }

  const entry = await applyAcademicUpdate(
    req.params.rollNumber.toUpperCase(),
    fields,
  );
  sendResponse(res, 200, "Academic record updated.", entry);
});

// ─── PATCH /api/admin/roster/students/:rollNumber/year  (superadmin) ──────────
// `year` is cohort identity and feeds eligibility, so coordinators can't set it.
export const updateYear = asyncHandler(async (req, res) => {
  pickBody(req.body, ["year"]);
  const { value, error } = parseYear(req.body.year);
  if (error) throw new ApiError(400, error);

  const entry = await applyAcademicUpdate(req.params.rollNumber.toUpperCase(), {
    year: value,
  });
  sendResponse(res, 200, "Year updated.", entry);
});
