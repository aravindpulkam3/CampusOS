// drive controller
// TODO: implement controller functions
import Drive from "../models/Drive.js";
import Application from "../models/Application.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import Notice from "../models/Notice.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

const checkEligibility = (drive, user) => {
  const reasons = [];
  if (drive.minCGPA > 0 && user.cgpa < drive.minCGPA)
    reasons.push(`Min CGPA ${drive.minCGPA} required (yours: ${user.cgpa})`);
  if (
    drive.eligibleBranches?.length > 0 &&
    !drive.eligibleBranches.includes(user.branch)
  )
    reasons.push(`Open to ${drive.eligibleBranches.join(", ")} only`);
  if (drive.minYear && user.year < drive.minYear)
    reasons.push(`Min year ${drive.minYear} required`);
  if (drive.maxYear && user.year > drive.maxYear)
    reasons.push(`Open to year ${drive.maxYear} and below`);
  return { eligible: reasons.length === 0, reasons };
};

// ─── GET /api/drives  (list + filters + search + pagination) ──────────────────
export const getDrives = asyncHandler(async (req, res) => {
  const {
    status, // "open" | "closed" | "upcoming"
    jobType, // "internship" | "fulltime"
    eligibleOnly, // "true" — filter to drives the user is eligible for
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const query = {};
  if (status) query.status = status;
  if (jobType) query.jobType = jobType;
  if (search) query.$text = { $search: search };

  // Eligibility filter — server-side
  if (eligibleOnly === "true" && req.user) {
    if (req.user.cgpa) query.minCGPA = { $lte: req.user.cgpa };
    if (req.user.branch)
      query.$or = [
        { eligibleBranches: { $size: 0 } },
        { eligibleBranches: req.user.branch },
      ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [drives, total] = await Promise.all([
    Drive.find(query)
      .select("-selectionProcess -companyDescription")
      .sort({ status: 1, registrationDeadline: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Drive.countDocuments(query),
  ]);

  // Attach eligibility result to each drive if user is logged in
  const drivesWithEligibility = drives.map((d) => ({
    ...d,
    ...(req.user ? { eligibility: checkEligibility(d, req.user) } : {}),
  }));

  sendResponse(res, 200, "Drives fetched.", {
    drives: drivesWithEligibility,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// ─── GET /api/drives/:id ──────────────────────────────────────────────────────
export const getDriveById = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id)
    .populate("postedBy", "firstName lastName")
    .lean();

  if (!drive)
    return res
      .status(404)
      .json({ success: false, message: "Drive not found." });

  // Attach eligibility + application status for logged-in user
  let eligibility = null;
  let myApplication = null;
  

  if (req.user) {
    eligibility = checkEligibility(drive, req.user);
    myApplication = await Application.findOne({
      student: req.user._id,
      drive: req.params.id,
    })
      .select("status currentRound appliedAt timeline")
      .lean();
  }

  // Sort selection process steps by order
  drive.selectionProcess?.sort((a, b) => a.order - b.order);

  sendResponse(res, 200, "Drive fetched.", {
    drive,
    eligibility,
    myApplication,
  });
});

// ─── POST /api/drives  (placementCoordinator or superadmin only) ──────────────
export const createDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.create({ ...req.body, postedBy: req.user._id });
  sendResponse(res, 201, "Drive created.", drive);
});

// ─── PATCH /api/drives/:id ────────────────────────────────────────────────────
export const updateDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true },
  );
  if (!drive)
    return res
      .status(404)
      .json({ success: false, message: "Drive not found." });
  sendResponse(res, 200, "Drive updated.", drive);
});

// ─── DELETE /api/drives/:id ───────────────────────────────────────────────────
export const deleteDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findByIdAndDelete(req.params.id);
  if (!drive)
    return res
      .status(404)
      .json({ success: false, message: "Drive not found." });
  sendResponse(res, 200, "Drive deleted.");
});

// ─── GET /api/drives/dashboard  (career section landing page data) ────────────
// Returns: upcoming drives, quick stats, recent notices (notices TBD via Notice model)
export const getCareerDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user   = req.user;
  const now    = new Date();

  const eligibilityFilter = {
    registrationDeadline: { $gt: now }, // greater than 
    $and: [
      {
        $or: [
          { eligibleBranches: { $size: 0 } },   
          { eligibleBranches: user.branch },  
        ],
      },
      { minCGPA:    { $lte: user.cgpa     ?? 10 } }, // less than or equal to 
      { maxBacklogs: { $gte: user.backlogs ?? 0  } }, // greater than or equal to
      { minYear:    { $lte: user.year     ?? 1  } },
      { maxYear:    { $gte: user.year     ?? 4  } },
    ],
  };

  const myApplications = await Application.find({ student: userId })
    .populate({
      path: "drive",
      select: "companyName companyLogo role jobType ctc stipend registrationDeadline location",
    })
    .sort({ appliedAt: -1 })
    .lean();

  const validApplications = myApplications.filter((a) => a.drive !== null);
  const appliedDriveIds   = validApplications.map((a) => a.drive._id);

  // ── 3. Eligible drives NOT yet applied to ──────────────────────────────
  const eligibleDrives = await Drive.find({
    ...eligibilityFilter,
    _id: { $nin: appliedDriveIds }, // not in
  })
    .select("companyName companyLogo role jobType ctc stipend registrationDeadline location")
    .sort({ registrationDeadline: 1 })
    .limit(6)
    .lean();

  // ── 4. Notices: from applied drives OR eligible open drives ─────────────
  const allEligibleIds = await Drive.find(eligibilityFilter)
    .select("_id").lean()
    .then((docs) => docs.map((d) => d._id));

  const driveIdsForNotices = [
    ...new Set([
      ...appliedDriveIds.map(String),
      ...allEligibleIds.map(String),
    ]),
  ];

  const recentNotices = await Notice.find({
    targetType: "drive",
    isArchived: false,
    $or: [
      { targetId: { $in: driveIdsForNotices } },
      { targetId: null },   // platform-wide placement notices
    ],
  })
    .populate("createdBy", "firstName lastName")
    .sort({ isPinned: -1, priority: -1, createdAt: -1 })
    .limit(8)
    .lean();

  // ── 5. Upcoming OA / Interview activities ──────────────────────────────
  const myActivities = validApplications
    .filter((a) => ["oa_scheduled", "interview_scheduled"].includes(a.status))
    .map((a) => ({
      _id:    a._id,
      status: a.status,
      drive: {
        _id:          a.drive._id,
        companyName:  a.drive.companyName,
        companyLogo:  a.drive.companyLogo,
        oaDate:        a.timeline.find((t) => t.status === "oa_scheduled")?.changedAt || null,
        interviewDate: a.timeline.find((t) => t.status === "interview_scheduled")?.changedAt || null,
      },
    }));

  // ── 6. Stats ───────────────────────────────────────────────────────────
  const totalEligible = await Drive.countDocuments(eligibilityFilter);

  return sendResponse(res, 200, "Dashboard data compiled successfully.", {
    eligibleDrives,
    myApplications: validApplications.map((a) => ({
      _id:      a._id,
      status:   a.status,
      appliedAt: a.appliedAt,
      drive: {
        _id:                  a.drive._id,
        companyName:          a.drive.companyName,
        companyLogo:          a.drive.companyLogo,
        role:                 a.drive.role,
        jobType:              a.drive.jobType,
        ctc:                  a.drive.ctc,
        stipend:              a.drive.stipend,
        registrationDeadline: a.drive.registrationDeadline,
      },
    })),
    myActivities,
    recentNotices,
    stats: {
      eligibleDrives:     totalEligible,
      applied:            validApplications.length,
      upcomingOA:         validApplications.filter((a) => a.status === "oa_scheduled").length,
      upcomingInterviews: validApplications.filter((a) => a.status === "interview_scheduled").length,
    },
  });
});
