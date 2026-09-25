import Drive from "../models/Drive.js";
import Application from "../models/Application.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import ApiError from "../utils/apiError.js";
import { isHttpUrl } from "../utils/validateUrl.js";
import Notice from "../models/Notice.js";
import deriveRoundStates from "../utils/roundState.js";
import {
  notifyEligibleStudents,
  notifyApplicationOutcome,
} from "../services/notification.service.js";
import {
  parseCsv,
  buildPreview,
  applyShortlist,
  finishDrive as finishDriveService,
} from "../services/shortlist.service.js";
import {
  buildEligibilityFilter,
  checkDriveEligibility as checkEligibility,
  getPlacementProfile,
} from "../services/eligibility.service.js";
import { getJSON, setJSON, del } from "../utils/cache.js";

const DRIVE_CATALOGUE_CACHE_KEY = "cache:drives:catalog:default";
const DRIVE_CATALOGUE_TTL = 60;
// Only fields needed before the default list is personalized, sorted and
// paginated. The full response documents are read live for the final page.
const CATALOGUE_FIELDS = [
  "_id",
  "registrationDeadline",
  "createdAt",
  "minCGPA",
  "minYear",
  "maxYear",
  "eligibleBranches",
  "batch",
  "maxBacklogs",
];
const toCatalogueRow = (drive) =>
  Object.fromEntries(
    CATALOGUE_FIELDS.filter((field) => drive[field] !== undefined)
      .map((field) => [field, drive[field]]),
  );

// ─── helpers ──────────────────────────────────────────────────────────────────

// Fields a coordinator may change via the generic edit form. Deliberately
// excludes status/rounds/currentRoundId/applicationCount/postedBy — those
// only ever change through the dedicated lifecycle actions below, never a
// blind mass-assignment.
const EDITABLE_DRIVE_FIELDS = [
  "companyName",
  "companyLogo",
  "role",
  "description",
  "jobType",
  "driveType",
  "location",
  "ctc",
  "stipend",
  "bond",
  "batch",
  "eligibleBranches",
  "minCGPA",
  "minYear",
  "maxYear",
  "maxBacklogs",
  "slots",
  "registrationDeadline",
  "startDate",
  "endDate",
  "applicationLink",
  "brochureUrl",
];

// These are rendered as links/images for every student, so they must be
// http(s) URLs. applicationLink is required (schema), so it can't be blanked;
// the optional two accept ""/null to mean "none".
const assertDriveUrls = (fields) => {
  for (const field of ["applicationLink", "brochureUrl", "companyLogo"]) {
    const value = fields[field];
    if (value === undefined) continue;
    if (field !== "applicationLink" && (value === "" || value === null)) continue;
    if (!isHttpUrl(value)) {
      throw new ApiError(400, `${field} must be an http(s) URL.`);
    }
  }
};

// Preconditions shared by previewShortlist/confirmShortlist: only the live
// current round, only once it's ended, only before it's been processed.
const getShortlistableRound = (drive, roundId) => {
  if (drive.status !== "active") {
    throw new ApiError(400, "This drive is not active.");
  }
  if (!drive.currentRoundId || String(drive.currentRoundId) !== String(roundId)) {
    throw new ApiError(400, "You can only process the shortlist for the current round.");
  }
  const round = drive.rounds.id(roundId);
  if (!round) throw new ApiError(404, "Round not found.");
  if (!round.endedAt) {
    throw new ApiError(400, "End this round before processing its results.");
  }
  if (round.processedAt) {
    throw new ApiError(400, "This round's results have already been processed.");
  }
  return round;
};

// ─── GET /api/drives  (list + filters + search + pagination) ──────────────────
export const getDrives = asyncHandler(async (req, res) => {
  // Strings only: Express 4 turns `?jobType[$ne]=x` into an operator object.
  const str = (v) => (typeof v === "string" ? v : undefined);
  const status = str(req.query.status);
  const jobType = str(req.query.jobType);
  const eligibleOnly = str(req.query.eligibleOnly);
  const search = str(req.query.search);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const query = {};
  // NOTE: this "status" query param means registration open/closed (derived
  // from registrationDeadline) — the UI's existing All/Open/Closed filter —
  // not Drive.status (the active/completed/cancelled lifecycle field, which
  // this endpoint doesn't filter on).
  const now = new Date();
  if (status === "open") query.registrationDeadline = { $gte: now };
  else if (status === "closed") query.registrationDeadline = { $lt: now };
  if (jobType) query.jobType = jobType;
  if (search) query.$text = { $search: search };

  // Same filter as the dashboard and applyToDrive. `if (req.user.cgpa)` used to
  // skip the CGPA clause entirely for a 0/unset CGPA, so "eligible only" quietly
  // listed drives the student didn't qualify for.
  if (eligibleOnly === "true" && req.user) {
    if (getPlacementProfile(req.user).canEvaluateEligibility) {
      Object.assign(query, buildEligibilityFilter(req.user));
    } else {
      // Can't evaluate — return nothing rather than implying everything qualifies.
      query._id = null;
    }
  }

  // Only the initial, unfiltered catalogue is shared. Other combinations
  // retain the existing Mongo query and never create per-filter cache keys.
  const useDefaultCatalogue = !status && !jobType && !search && eligibleOnly !== "true";
  let catalogueCacheHit = false;
  let allDrives;
  if (useDefaultCatalogue) {
    allDrives = await getJSON(DRIVE_CATALOGUE_CACHE_KEY);
    catalogueCacheHit = allDrives !== null;
  }
  if (!catalogueCacheHit) {
    allDrives = await Drive.find(query).select("-rounds").lean();
    if (useDefaultCatalogue) {
      await setJSON(
        DRIVE_CATALOGUE_CACHE_KEY,
        allDrives.map(toCatalogueRow),
        DRIVE_CATALOGUE_TTL,
      );
    }
  }

  let appliedDriveIdsSet = new Set();
  if (req.user) {
    const studentApplications = await Application.find({
      student: req.user._id,
      drive: { $in: allDrives.map((d) => d._id) },
    })
      .select("drive")
      .lean();
    appliedDriveIdsSet = new Set(
      studentApplications.map((app) => app.drive.toString()),
    );
  }

  const processedDrives = allDrives.map((d) => {
    const hasApplied = appliedDriveIdsSet.has(d._id.toString());
    const isOpen = d.registrationDeadline
      ? new Date(d.registrationDeadline) >= now
      : false;

    let sortWeight = 0;
    if (!hasApplied && isOpen) sortWeight = 4;
    else if (hasApplied && isOpen) sortWeight = 3;
    else if (hasApplied && !isOpen) sortWeight = 2;
    else sortWeight = 1;

    return {
      ...d,
      hasApplied,
      sortWeight,
      ...(req.user ? { eligibility: checkEligibility(d, req.user) } : {}),
    };
  });

  // Sort them according to rules, then fallback to most recently created
  processedDrives.sort((a, b) => {
    if (a.sortWeight !== b.sortWeight) {
      return b.sortWeight - a.sortWeight;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const total = processedDrives.length;
  const skip = (page - 1) * limit;
  let paginatedDrives = processedDrives.slice(skip, skip + limit);

  if (catalogueCacheHit && paginatedDrives.length) {
    // Rehydrate the final page so GET /api/drives keeps its existing document
    // fields, including live applicationCount/currentRoundId/updatedAt.
    const liveRows = await Drive.find({
      _id: { $in: paginatedDrives.map((drive) => drive._id) },
    }).select("-rounds").lean();
    const liveById = new Map(liveRows.map((drive) => [String(drive._id), drive]));
    paginatedDrives = paginatedDrives.flatMap((drive) => {
      const live = liveById.get(String(drive._id));
      if (!live) return [];
      return [{
        ...live,
        hasApplied: drive.hasApplied,
        sortWeight: drive.sortWeight,
        ...(req.user ? { eligibility: checkEligibility(live, req.user) } : {}),
      }];
    });
  }

  sendResponse(res, 200, "Drives fetched.", {
    drives: paginatedDrives,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  });
});

// ─── GET /api/drives/:id ──────────────────────────────────────────────────────
export const getDriveById = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id)
    .populate("postedBy", "firstName lastName")
    .lean();

  if (!drive) throw new ApiError(404, "Drive not found.");

  let eligibility = null;
  let myApplication = null;

  if (req.user) {
    eligibility = checkEligibility(drive, req.user);
    myApplication = await Application.findOne({
      student: req.user._id,
      drive: req.params.id,
    })
      .select("status timeline appliedAt")
      .lean();
  }

  const rounds = deriveRoundStates(drive.rounds || [], drive.currentRoundId);

  sendResponse(res, 200, "Drive fetched.", {
    drive: { ...drive, rounds },
    eligibility,
    myApplication,
  });
});

// ─── POST /api/drives  (placementCoordinator or superadmin only) ──────────────
export const createDrive = asyncHandler(async (req, res) => {
  // Same allow-list as updateDrive: lifecycle fields (status, rounds,
  // currentRoundId, applicationCount) start at their schema defaults and only
  // ever change through the dedicated lifecycle actions.
  const fields = {};
  for (const field of EDITABLE_DRIVE_FIELDS) {
    if (req.body?.[field] !== undefined) fields[field] = req.body[field];
  }
  assertDriveUrls(fields);
  const drive = await Drive.create({ ...fields, postedBy: req.user._id });
  await del(DRIVE_CATALOGUE_CACHE_KEY);

  notifyEligibleStudents(drive, req.user._id, {
    type: "drive_new",
    title: "New placement drive",
    message: `${drive.companyName} is hiring for ${drive.role} — check your eligibility.`,
    targetType: "drive",
    targetId: drive._id,
    createdBy: req.user._id,
  });

  sendResponse(res, 201, "Drive created.", drive);
});

// ─── PATCH /api/drives/:id  (allow-listed fields only) ────────────────────────
export const updateDrive = asyncHandler(async (req, res) => {
  const updates = {};
  for (const field of EDITABLE_DRIVE_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  assertDriveUrls(updates);

  // Completed/cancelled drives are closed records: editing them (e.g.
  // reopening registration or changing eligibility) would rewrite history.
  const drive = await Drive.findOneAndUpdate(
    { _id: req.params.id, status: "active" },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!drive) {
    if (await Drive.exists({ _id: req.params.id })) {
      throw new ApiError(400, "Only active drives can be edited.");
    }
    throw new ApiError(404, "Drive not found.");
  }
  await del(DRIVE_CATALOGUE_CACHE_KEY);
  sendResponse(res, 200, "Drive updated.", drive);
});

// ─── DELETE /api/drives/:id ───────────────────────────────────────────────────
export const deleteDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findByIdAndDelete(req.params.id);
  if (!drive) throw new ApiError(404, "Drive not found.");
  await del(DRIVE_CATALOGUE_CACHE_KEY);
  sendResponse(res, 200, "Drive deleted.");
});

// ─── GET /api/drives/:id/applications  (coordinator only) ─────────────────────
export const getDriveApplications = asyncHandler(async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const query = { drive: req.params.id };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [applications, total] = await Promise.all([
    Application.find(query)
      // cgpa/backlogs are what eligibility was evaluated against (roster-owned).
      .populate("student", "firstName lastName email branch year cgpa backlogs rollNumber")
      // _id breaks appliedAt ties, so skip/limit pages never overlap or skip rows.
      .sort({ appliedAt: 1, _id: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Application.countDocuments(query),
  ]);

  sendResponse(res, 200, "Applications fetched.", {
    applications,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// ─── GET /api/drives/dashboard  (career section landing page data) ────────────
export const getCareerDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = req.user;
  const now = new Date();

  // Shared with the dashboard's Eligible Drives and with applyToDrive — the old
  // local copy used `user.cgpa ?? 10`, which made a student with no CGPA look
  // maximally eligible for drives they'd then be rejected from.
  const placementProfile = getPlacementProfile(user);
  const eligibilityFilter = placementProfile.canEvaluateEligibility
    ? { registrationDeadline: { $gt: now }, ...buildEligibilityFilter(user) }
    : null;

  const myApplications = await Application.find({ student: userId })
    .populate({
      path: "drive",
      select:
        "companyName companyLogo role jobType ctc stipend registrationDeadline location rounds currentRoundId",
    })
    .sort({ appliedAt: -1 })
    .lean();

  const validApplications = myApplications.filter((a) => a.drive !== null);
  const appliedDriveIds = validApplications.map((a) => a.drive._id);

  // With no CGPA on file we cannot evaluate eligibility at all. Return nothing
  // and let the UI ask for a profile completion — never fall through to an
  // unfiltered find(), which would advertise every drive on campus as eligible.
  const [eligibleDrives, allEligibleIds] = eligibilityFilter
    ? await Promise.all([
        Drive.find({ ...eligibilityFilter, _id: { $nin: appliedDriveIds } })
          .select(
            "companyName companyLogo role jobType ctc stipend registrationDeadline location",
          )
          .sort({ registrationDeadline: 1 })
          .limit(6)
          .lean(),
        Drive.find(eligibilityFilter)
          .select("_id")
          .lean()
          .then((docs) => docs.map((d) => d._id)),
      ])
    : [[], []];

  const driveIdsForNotices = [
    ...new Set([...appliedDriveIds.map(String), ...allEligibleIds.map(String)]),
  ];

  const recentNotices = await Notice.find({
    targetType: "drive",
    isArchived: false,
    $or: [
      { targetId: { $in: driveIdsForNotices } },
      { targetId: null },
    ],
  })
    .populate("createdBy", "firstName lastName")
    .sort({ isPinned: -1, priority: -1, createdAt: -1 })
    .limit(8)
    .lean();

  // Active applications and the round they're actually at right now (derived
  // via the same helper the Rounds tab uses) — no fixed OA/interview concept.
  const myActivities = validApplications
    .filter((a) => a.status === "active" && a.drive.currentRoundId)
    .map((a) => {
      const rounds = deriveRoundStates(a.drive.rounds || [], a.drive.currentRoundId);
      const currentRound = rounds.find(
        (r) => String(r._id) === String(a.drive.currentRoundId),
      );
      return {
        _id: a._id,
        drive: {
          _id: a.drive._id,
          companyName: a.drive.companyName,
          companyLogo: a.drive.companyLogo,
        },
        round: currentRound
          ? { name: currentRound.name, derivedState: currentRound.derivedState }
          : null,
      };
    });

  const totalEligible = allEligibleIds.length;

  return sendResponse(res, 200, "Dashboard data compiled successfully.", {
    eligibleDrives,
    placementProfile,
    myApplications: validApplications.map((a) => ({
      _id: a._id,
      status: a.status,
      appliedAt: a.appliedAt,
      drive: {
        _id: a.drive._id,
        companyName: a.drive.companyName,
        companyLogo: a.drive.companyLogo,
        role: a.drive.role,
        jobType: a.drive.jobType,
        ctc: a.drive.ctc,
        stipend: a.drive.stipend,
        registrationDeadline: a.drive.registrationDeadline,
      },
    })),
    myActivities,
    recentNotices,
    stats: {
      eligibleDrives: totalEligible,
      applied: validApplications.length,
      activeApplications: validApplications.filter((a) => a.status === "active")
        .length,
    },
  });
});

// ─── Rounds ─────────────────────────────────────────────────────────────────

// POST /api/drives/:id/rounds — pure append, never touches applicant state
// or currentRoundId. Creating a round has no lifecycle side effect.
export const addRound = asyncHandler(async (req, res) => {
  const { name, startDate } = req.body;
  if (!name || !name.toString().trim()) {
    throw new ApiError(400, "Round name is required.");
  }

  const drive = await Drive.findById(req.params.id);
  if (!drive) throw new ApiError(404, "Drive not found.");
  if (drive.status !== "active") {
    throw new ApiError(400, "Cannot add rounds to a drive that is not active.");
  }

  drive.rounds.push({ name: name.toString().trim(), startDate: startDate || null });
  await drive.save();

  sendResponse(res, 201, "Round added.", {
    rounds: deriveRoundStates(drive.rounds, drive.currentRoundId),
  });
});

// PATCH /api/drives/:id/rounds/:roundId — rename/reschedule, allowed on any
// round at any lifecycle stage (purely cosmetic; timeline entries reference
// a round only by id, never a name/date snapshot).
export const updateRound = asyncHandler(async (req, res) => {
  const { name, startDate } = req.body;

  const drive = await Drive.findById(req.params.id);
  if (!drive) throw new ApiError(404, "Drive not found.");
  if (drive.status !== "active") {
    throw new ApiError(400, "Cannot edit rounds on a drive that is not active.");
  }

  const round = drive.rounds.id(req.params.roundId);
  if (!round) throw new ApiError(404, "Round not found.");

  if (name !== undefined) {
    if (!name.toString().trim()) throw new ApiError(400, "Round name cannot be empty.");
    round.name = name.toString().trim();
  }
  if (startDate !== undefined) {
    round.startDate = startDate || null;
  }

  await drive.save();
  sendResponse(res, 200, "Round updated.", {
    rounds: deriveRoundStates(drive.rounds, drive.currentRoundId),
  });
});

// DELETE /api/drives/:id/rounds/:roundId — pending-only (never yet current).
export const deleteRound = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id);
  if (!drive) throw new ApiError(404, "Drive not found.");
  if (drive.status !== "active") {
    throw new ApiError(400, "Cannot delete rounds on a drive that is not active.");
  }

  const roundIndex = drive.rounds.findIndex(
    (r) => String(r._id) === req.params.roundId,
  );
  if (roundIndex === -1) throw new ApiError(404, "Round not found.");

  const currentIndex = drive.currentRoundId
    ? drive.rounds.findIndex((r) => String(r._id) === String(drive.currentRoundId))
    : -1;

  if (currentIndex !== -1 && roundIndex <= currentIndex) {
    throw new ApiError(400, "Only pending rounds (not yet reached) can be deleted.");
  }

  drive.rounds.splice(roundIndex, 1);
  await drive.save();

  sendResponse(res, 200, "Round deleted.", {
    rounds: deriveRoundStates(drive.rounds, drive.currentRoundId),
  });
});

// POST /api/drives/:id/rounds/:roundId/end — marks the physical round over.
// Never touches applicant state or currentRoundId; results are now awaited.
export const endRound = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id);
  if (!drive) throw new ApiError(404, "Drive not found.");
  if (drive.status !== "active") {
    throw new ApiError(400, "This drive is not active.");
  }
  if (!drive.currentRoundId || String(drive.currentRoundId) !== req.params.roundId) {
    throw new ApiError(400, "Only the current round can be ended.");
  }

  const round = drive.rounds.id(req.params.roundId);
  if (!round) throw new ApiError(404, "Round not found.");
  if (round.endedAt) throw new ApiError(400, "This round has already been ended.");
  if (!round.startDate) {
    throw new ApiError(400, "Set a start date for this round before ending it.");
  }
  if (new Date() < new Date(round.startDate)) {
    throw new ApiError(400, "This round's start date hasn't arrived yet.");
  }

  round.endedAt = new Date();
  await drive.save();

  sendResponse(res, 200, "Round ended.", {
    rounds: deriveRoundStates(drive.rounds, drive.currentRoundId),
  });
});

// POST /api/drives/:id/rounds/:roundId/advance — the ONLY action that ever
// sets currentRoundId. First assignment requires registration to be closed;
// subsequent moves require the round being left to be ended + processed,
// and only ever advance to the immediately-next round (no skipping).
export const advanceRound = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id);
  if (!drive) throw new ApiError(404, "Drive not found.");

  const targetRoundId = req.params.roundId;

  // Idempotent no-op for a double-clicked/repeated call.
  if (drive.currentRoundId && String(drive.currentRoundId) === targetRoundId) {
    return sendResponse(res, 200, "Already on this round.", {
      rounds: deriveRoundStates(drive.rounds, drive.currentRoundId),
      currentRoundId: drive.currentRoundId,
    });
  }

  if (drive.status !== "active") {
    throw new ApiError(400, "This drive is not active.");
  }

  const targetIndex = drive.rounds.findIndex(
    (r) => String(r._id) === targetRoundId,
  );
  if (targetIndex === -1) throw new ApiError(404, "Round not found.");

  let previousCurrentRoundId = null;

  if (!drive.currentRoundId) {
    if (targetIndex !== 0) {
      throw new ApiError(400, "Recruitment must begin with the first round.");
    }
    if (new Date() < new Date(drive.registrationDeadline)) {
      throw new ApiError(400, "Registration must close before recruitment can begin.");
    }
  } else {
    const currentIndex = drive.rounds.findIndex(
      (r) => String(r._id) === String(drive.currentRoundId),
    );
    if (targetIndex !== currentIndex + 1) {
      throw new ApiError(400, "You can only move to the immediately next round.");
    }
    const currentRound = drive.rounds[currentIndex];
    if (!currentRound.endedAt || !currentRound.processedAt) {
      throw new ApiError(
        400,
        "The current round must be ended and its results processed before advancing.",
      );
    }
    previousCurrentRoundId = drive.currentRoundId;
  }

  const result = await Drive.updateOne(
    { _id: drive._id, currentRoundId: previousCurrentRoundId },
    { $set: { currentRoundId: drive.rounds[targetIndex]._id } },
  );
  if (result.modifiedCount !== 1) {
    throw new ApiError(409, "This drive's current round changed — please refresh and try again.");
  }

  const updatedDrive = await Drive.findById(drive._id).lean();
  sendResponse(res, 200, "Advanced to next round.", {
    rounds: deriveRoundStates(updatedDrive.rounds, updatedDrive.currentRoundId),
    currentRoundId: updatedDrive.currentRoundId,
  });
});

// ─── Shortlist ──────────────────────────────────────────────────────────────

// POST /api/drives/:id/rounds/:roundId/shortlist/preview — pure read, never
// mutates anything.
export const previewShortlist = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id);
  if (!drive) throw new ApiError(404, "Drive not found.");

  getShortlistableRound(drive, req.params.roundId);

  if (!req.file) throw new ApiError(400, "A CSV file is required.");

  const rollNumbers = parseCsv(req.file.buffer);
  const preview = await buildPreview(drive._id, rollNumbers);

  sendResponse(res, 200, "Preview generated.", preview);
});

// POST /api/drives/:id/rounds/:roundId/shortlist/confirm — the only thing
// this does is advance shortlisted / reject the rest for THIS round; it
// never creates/selects/ends a round, moves currentRoundId, or finalizes
// the drive.
export const confirmShortlist = asyncHandler(async (req, res) => {
  const { rollNumbers } = req.body;
  if (!Array.isArray(rollNumbers)) {
    throw new ApiError(400, "rollNumbers must be an array.");
  }

  const drive = await Drive.findById(req.params.id);
  if (!drive) throw new ApiError(404, "Drive not found.");

  getShortlistableRound(drive, req.params.roundId);

  const normalizedRollNumbers = rollNumbers
    .map((rn) => (rn || "").toString().trim().toUpperCase())
    .filter((rn) => rn.length > 0);

  const { shortlistedStudentIds, rejectedStudentIds } = await applyShortlist(
    drive._id,
    req.params.roundId,
    { rollNumbers: normalizedRollNumbers, actorId: req.user._id },
  );

  const round = drive.rounds.id(req.params.roundId);
  notifyApplicationOutcome(
    shortlistedStudentIds,
    {
      title: "You've been shortlisted",
      message: `You've been shortlisted to continue after ${round.name} for ${drive.companyName}.`,
      targetId: drive._id,
    },
    req.user._id,
  );
  notifyApplicationOutcome(
    rejectedStudentIds,
    {
      title: "Application update",
      message: `You were not shortlisted to continue after ${round.name} for ${drive.companyName}.`,
      targetId: drive._id,
    },
    req.user._id,
  );

  const updatedDrive = await Drive.findById(drive._id).lean();
  sendResponse(res, 200, "Shortlist processed.", {
    rounds: deriveRoundStates(updatedDrive.rounds, updatedDrive.currentRoundId),
    shortlistedCount: shortlistedStudentIds.length,
    rejectedCount: rejectedStudentIds.length,
  });
});

// ─── Drive lifecycle ────────────────────────────────────────────────────────

// POST /api/drives/:id/finish — only once the current round is the LAST
// entry in rounds[] and has been ended + processed. No CSV — the narrowing
// already happened via the last confirmShortlist.
export const finishDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id);
  if (!drive) throw new ApiError(404, "Drive not found.");

  if (drive.status !== "active") {
    throw new ApiError(400, "This drive is not active.");
  }
  if (!drive.currentRoundId) {
    throw new ApiError(400, "This drive hasn't started any rounds yet.");
  }

  const currentIndex = drive.rounds.findIndex(
    (r) => String(r._id) === String(drive.currentRoundId),
  );
  const currentRound = drive.rounds[currentIndex];
  if (!currentRound.endedAt || !currentRound.processedAt) {
    throw new ApiError(400, "The current round must be ended and its results processed before finishing the drive.");
  }
  if (currentIndex !== drive.rounds.length - 1) {
    throw new ApiError(400, "Cannot finish the drive while pending rounds remain.");
  }

  const { selectedStudentIds } = await finishDriveService(
    drive._id,
    drive.currentRoundId,
    req.user._id,
  );
  await del(DRIVE_CATALOGUE_CACHE_KEY);

  notifyApplicationOutcome(
    selectedStudentIds,
    {
      title: "Congratulations!",
      message: `You've been selected for ${drive.companyName} — ${drive.role}.`,
      targetId: drive._id,
    },
    req.user._id,
  );

  sendResponse(res, 200, "Drive finished.", { selectedCount: selectedStudentIds.length });
});

// POST /api/drives/:id/cancel — terminal, no cascade to existing applications.
export const cancelDrive = asyncHandler(async (req, res) => {
  const result = await Drive.updateOne(
    { _id: req.params.id, status: "active" },
    { $set: { status: "cancelled" } },
  );
  if (result.matchedCount === 0) {
    const exists = await Drive.exists({ _id: req.params.id });
    if (!exists) throw new ApiError(404, "Drive not found.");
    throw new ApiError(400, "This drive is not active.");
  }
  await del(DRIVE_CATALOGUE_CACHE_KEY);
  sendResponse(res, 200, "Drive cancelled.");
});
