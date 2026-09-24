import Notice from "../models/Notice.js";
import Classroom from "../models/Classroom.js";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import mongoose from "mongoose";
import Drive from "../models/Drive.js";
import Application from "../models/Application.js";
import ApiError from "../utils/apiError.js";
import {
  buildEligibilityFilter,
  getPlacementProfile,
} from "../services/eligibility.service.js";
import {
  notifyClubFollowers,
  notifyEventRegistrants,
  notifyDriveApplicants,
  notifyClassroomStudents,
  notifyAllUsers,
} from "../services/notification.service.js";

// ─── permission check ─────────────────────────────────────────────────────────
// Global role -> application-wide authority (platform, drive). Resource
// relationship -> authority over that one resource (classroom/club/event) —
// never a global role flag. Async because classroom/club/event checks need
// to look up the actual target resource.
const canPost = async (user, targetType, targetId) => {
  switch (targetType) {
    case "platform":
      return user.role === "superadmin";
    case "drive":
      return ["placementCoordinator", "superadmin"].includes(user.role);
    case "classroom": {
      if (user.role === "superadmin") return true;
      const classroom = await Classroom.findById(targetId).select("classRepresentative");
      return !!classroom && classroom.classRepresentative?.toString() === user._id.toString();
    }
    case "clubs": {
      if (user.role === "superadmin") return true;
      const club = await Club.findById(targetId).select("clubAdmins");
      return !!club && club.clubAdmins.some((id) => id.toString() === user._id.toString());
    }
    case "events": {
      if (user.role === "superadmin") return true;
      const event = await Event.findById(targetId).select("organizerClub");
      if (!event) return false;
      const club = await Club.findById(event.organizerClub).select("clubAdmins");
      return !!club && club.clubAdmins.some((id) => id.toString() === user._id.toString());
    }
    default:
      return false;
  }
};

// What a notice listing may be for: the two personalized feeds, or one of the
// stored target types (taken from the schema, so the lists can't drift).
const READABLE_TARGET_TYPES = new Set([
  "community",
  "career",
  ...Notice.schema.path("targetType").enumValues,
]);

// Classroom notices are for that classroom: its students, its CR, superadmin.
const canReadClassroom = async (user, classroomId) => {
  if (user.role === "superadmin") return true;
  if (user.classroom && String(user.classroom) === String(classroomId)) return true;
  const classroom = await Classroom.findById(classroomId).select("classRepresentative").lean();
  return !!classroom && String(classroom.classRepresentative) === String(user._id);
};

// Owner or superadmin. Shared by every management action (pin/archive/delete)
// so their permissions can't drift apart.
const canManage = (user, notice) =>
  notice.createdBy.toString() === user._id.toString() ||
  user.role === "superadmin";

// ─── POST /api/notices ────────────────────────────────────────────────────────
export const createNotice = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    targetType,
    targetId,
    priority,
    expiresAt,
    scopeToCurrentSemester,
  } = req.body;

  if (
    typeof title !== "string" || !title.trim() ||
    typeof content !== "string" || !content.trim() ||
    typeof targetType !== "string" || !targetType
  ) {
    return res.status(400).json({
      success: false,
      message: "Title, content, and targetType are required.",
    });
  }

  // platform notices don't need a targetId; everything else needs a real id
  // (a string — an operator object must never reach the permission lookup).
  if (targetType !== "platform" && (typeof targetId !== "string" || !mongoose.isValidObjectId(targetId))) {
    return res.status(400).json({
      success: false,
      message: "targetId is required for non-platform notices.",
    });
  }

  if (!(await canPost(req.user, targetType, targetId))) {
    return res.status(403).json({
      success: false,
      message: "You are not authorised to post this type of notice.",
    });
  }

  // The client only ever sends a boolean — the actual semester number is
  // resolved server-side from the target classroom's current semester, so a
  // CR can never tag a notice to an arbitrary semester.
  let semesterNumber = null;
  if (targetType === "classroom" && scopeToCurrentSemester) {
    const classroom = await Classroom.findById(targetId).select("currentSemesterNumber");
    semesterNumber = classroom?.currentSemesterNumber ?? null;
  }

  const notice = await Notice.create({
    title: title.trim(),
    content: content.trim(),
    targetType,
    targetId: targetType === "platform" ? null : targetId,
    semesterNumber,
    priority: priority || "normal",
    expiresAt: expiresAt || null,
    createdBy: req.user._id,
  });

  const noticeFields = {
    title: notice.title,
    message: notice.content,
    targetType: "notice",
    targetId: notice._id,
    createdBy: req.user._id,
  };

  switch (targetType) {
    case "clubs":
      notifyClubFollowers(notice.targetId, req.user._id, { ...noticeFields, type: "club_notice" });
      break;
    case "events":
      notifyEventRegistrants(notice.targetId, req.user._id, { ...noticeFields, type: "event_notice" });
      break;
    case "drive":
      notifyDriveApplicants(notice.targetId, req.user._id, { ...noticeFields, type: "drive_notice" });
      break;
    case "classroom":
      notifyClassroomStudents(notice.targetId, req.user._id, { ...noticeFields, type: "classroom_notice" });
      break;
    case "platform":
      notifyAllUsers(req.user._id, { ...noticeFields, type: "platform_notice" });
      break;
  }

  await notice.populate("createdBy", "firstName lastName role");
  sendResponse(res, 201, "Notice posted.", notice);
});

export const getNotices = asyncHandler(async (req, res) => {
  // Express 4 parses `?targetType[$ne]=x` into an operator object; only plain
  // strings may reach the query.
  const targetType = typeof req.query.targetType === "string" ? req.query.targetType : undefined;
  const targetId = typeof req.query.targetId === "string" ? req.query.targetId : undefined;
  if ((req.query.targetType !== undefined && targetType === undefined) ||
      (req.query.targetId !== undefined && targetId === undefined)) {
    throw new ApiError(400, "Invalid notice filter.");
  }
  // A listing must name what it lists. Without a targetType the query below
  // would span every target, including every classroom's notices.
  if (!READABLE_TARGET_TYPES.has(targetType)) {
    throw new ApiError(400, "Invalid notice filter.");
  }
  const user = req.user;

  // Base persistent query layer
  const query = { isArchived: false };

  // NOTE: the old `targetType === "dashboard"` branch lived here. The dashboard
  // now gets its personalized notices directly from GET /api/dashboard (see
  // services/dashboard.service.js), so the page makes one request instead of two
  // and this duplicate query is gone.
  if (targetType === "community") {
    if (!user) {
      throw new ApiError(401, "Authentication required for community feed.");
    }

    // `joinedClubs` used to be spread in here — User has no such field, so it
    // was always undefined.
    const clubIds = user.followedClubs || [];
    const registeredEventIds = user.registeredEvents || [];

    query.$or = [
      { targetType: "clubs", targetId: { $in: clubIds } },
      { targetType: "events", targetId: { $in: registeredEventIds } },
    ];

    // ─── 3. DYNAMIC CAREER FEED INTERCEPTION ──────────────────────
  } else if (targetType === "career") {
    if (!user) {
      throw new ApiError(401, "Authentication required for career feed.");
    }

    const studentApplications = await Application.find({ student: user._id })
      .select("drive")
      .lean();
    const appliedDriveIds = studentApplications.map((app) => app.drive);

    // Shared eligibility service — the old inline copy used `user.cgpa || 0`,
    // which matched only minCGPA-0 drives for anyone without a CGPA on file.
    const eligibleDrives = await Drive.find({
      status: "active",
      $or: [
        { _id: { $in: appliedDriveIds } },
        ...(getPlacementProfile(user).canEvaluateEligibility
          ? [buildEligibilityFilter(user)]
          : []),
      ],
    })
      .select("_id")
      .lean();

    const driveIds = eligibleDrives.map((drive) => drive._id);
    query.targetType = { $in: ["drive", "drives"] };
    query.targetId = { $in: driveIds };

    // ─── 4. DIRECT TARGET SPECIFIC LOOKUPS ────────────────────────
  } else if (targetType === "classroom" && targetId) {
    if (!mongoose.isValidObjectId(targetId) || !(await canReadClassroom(user, targetId))) {
      throw new ApiError(403, "You can only view notices for your own classroom.");
    }
    const classroomDoc = mongoose.Types.ObjectId.isValid(targetId)
      ? await Classroom.findById(targetId).select("currentSemesterNumber")
      : null;

    query.targetType = "classroom";
    query.targetId = mongoose.Types.ObjectId.isValid(targetId)
      ? new mongoose.Types.ObjectId(targetId)
      : targetId;
    query.$or = [
      { semesterNumber: null },
      { semesterNumber: classroomDoc?.currentSemesterNumber ?? null },
    ];
  } else {
    // A classroom listing without a specific id would span every classroom.
    if (targetType === "classroom" && user.role !== "superadmin") {
      throw new ApiError(403, "You can only view notices for your own classroom.");
    }
    if (targetType) query.targetType = targetType;

    if (targetId && targetId !== "null" && targetId !== "undefined") {
      if (mongoose.Types.ObjectId.isValid(targetId)) {
        query.targetId = new mongoose.Types.ObjectId(targetId);
      } else {
        query.targetId = targetId;
      }
    }
  }

  // ─── 5. UNEXPIRED DATES RULE GROUP ISOLATION ──────────────────
  query.$and = [
    {
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    },
  ];

  // ─── 6. EXECUTE FETCH PIPELINE ────────────────────────────────
  let notices = await Notice.find(query)
    .populate("createdBy", "firstName lastName role")
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(15)
    .lean();

  // ─── 7. DYNAMIC REF POPULATORS ────────────────────────────────
  if (notices.length > 0) {
    const clubsNotices = notices.filter((n) => n.targetType === "clubs");
    const eventsNotices = notices.filter((n) => n.targetType === "events");
    const driveNotices = notices.filter(
      (n) => n.targetType === "drive" || n.targetType === "drives",
    );

    if (clubsNotices.length > 0) {
      await Notice.populate(clubsNotices, {
        path: "targetId",
        model: "Club",
        select: "clubName logo",
      });
    }
    if (eventsNotices.length > 0) {
      await Notice.populate(eventsNotices, {
        path: "targetId",
        model: "Event",
        select: "eventName",
      });
    }
    if (driveNotices.length > 0) {
      await Notice.populate(driveNotices, {
        path: "targetId",
        model: "Drive",
        select: "companyName role",
      });
    }
  }

  // ─── 8. PRIORITIZATION SORTING & SLICING ──────────────────────
  const priorityWeights = { urgent: 3, high: 2, normal: 1, low: 0 };
  notices.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return b.isPinned - a.isPinned;
    return (
      (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0)
    );
  });

  // Keep final presentation compact and fast
  const finalFeed = notices.slice(0, 5);

  return sendResponse(res, 200, "Notices fetched safely.", {
    notices: finalFeed,
  });
});
// ─── GET /api/notices/:id ─────────────────────────────────────────────────────
export const getNoticeById = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id).populate(
    "createdBy",
    "firstName lastName role",
  );

  if (!notice) {
    return res
      .status(404)
      .json({ success: false, message: "Notice not found." });
  }
  // 404 rather than 403, so ids of other classrooms' notices aren't confirmed.
  if (notice.targetType === "classroom" && !(await canReadClassroom(req.user, notice.targetId))) {
    return res
      .status(404)
      .json({ success: false, message: "Notice not found." });
  }

  sendResponse(res, 200, "Notice fetched.", notice);
});

// ─── DELETE /api/notices/:id ──────────────────────────────────────────────────
export const deleteNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice)
    return res.status(404).json({ success: false, message: "Not found." });

  if (!canManage(req.user, notice)) {
    return res.status(403).json({ success: false, message: "Not authorised." });
  }

  await notice.deleteOne();
  sendResponse(res, 200, "Notice deleted.");
});

// ─── PATCH /api/notices/:id/pin  (toggle) ────────────────────────────────────
export const togglePin = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice)
    return res.status(404).json({ success: false, message: "Not found." });

  if (!canManage(req.user, notice)) {
    return res.status(403).json({ success: false, message: "Not authorised." });
  }

  notice.isPinned = !notice.isPinned;
  await notice.save();
  sendResponse(
    res,
    200,
    notice.isPinned ? "Notice pinned." : "Notice unpinned.",
    {
      isPinned: notice.isPinned,
    },
  );
});

// ─── PATCH /api/notices/:id/archive ──────────────────────────────────────────
export const archiveNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice)
    return res.status(404).json({ success: false, message: "Not found." });

  if (!canManage(req.user, notice)) {
    return res.status(403).json({ success: false, message: "Not authorised." });
  }

  notice.isArchived = true;
  await notice.save();
  sendResponse(res, 200, "Notice archived.");
});
