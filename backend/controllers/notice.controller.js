import Notice from "../models/Notice.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import mongoose from "mongoose";

// ─── permission check ─────────────────────────────────────────────────────────
// Returns true if the user is allowed to post a notice for the given targetType
// Full enforcement is done in middleware chains on routes, but this guard
// gives controllers a second layer and a clear error message.
const canPost = (user, targetType) => {
  switch (targetType) {
    case "platform":
      return user.role === "superadmin";
    case "drive":
      return ["placementCoordinator", "superadmin"].includes(user.role);
    case "classroom":
      return ["classRep", "superadmin"].includes(user.role);
    // club + event: checked via clubAdminMiddleware on the route level
    case "clubs":
    case "events":
      return true; // route is already guarded by clubAdminMiddleware
    default:
      return false;
  }
};

// ─── POST /api/notices ────────────────────────────────────────────────────────
export const createNotice = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    targetType,
    targetId,
    noticeType,
    priority,
    metadata,
    expiresAt,
    attachments,
  } = req.body;

  if (!title?.trim() || !content?.trim() || !targetType) {
    return res.status(400).json({
      success: false,
      message: "Title, content, and targetType are required.",
    });
  }

  if (!canPost(req.user, targetType)) {
    return res.status(403).json({
      success: false,
      message: "You are not authorised to post this type of notice.",
    });
  }

  // platform notices don't need a targetId
  if (targetType !== "platform" && !targetId) {
    return res.status(400).json({
      success: false,
      message: "targetId is required for non-platform notices.",
    });
  }

  const notice = await Notice.create({
    title: title.trim(),
    content: content.trim(),
    targetType,
    targetId: targetType === "platform" ? null : targetId,
    noticeType: noticeType || "announcement",
    priority: priority || "normal",
    metadata: metadata || {},
    expiresAt: expiresAt || null,
    attachments: attachments || [],
    createdBy: req.user._id,
  });

  await notice.populate("createdBy", "firstName lastName role");
  sendResponse(res, 201, "Notice posted.", notice);
});

// ─── GET /api/notices?targetType=&targetId=&page=&limit= ─────────────────────
// Used by every module — classroom, club, event, drive, platform
export const getNotices = asyncHandler(async (req, res) => {
  const { targetType, targetId, page = 1, limit = 20 } = req.query;
  const user = req.user;

  // Base persistent query layer
  const query = { isArchived: false };

  // ─── 1. DYNAMIC COMMUNITY FEED INTERCEPTION ───
  if (targetType === "community") {
    if (!user) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Authentication required for community feed.",
        });
    }

    // Combine both followed and joined clubs, filtering out potential duplicates safely
    const clubIds = [
      ...(user.followedClubs || []),
      ...(user.joinedClubs || []),
    ];

    const registeredEventIds = user.registeredEvents || [];
   
    query.$or = [
      {
        targetType: "clubs",
        targetId: { $in: clubIds },
      },
      {
        targetType: "events",
        targetId: { $in: registeredEventIds },
      },
    ];
  } else {
    // ─── 2. STANDARD FEED LOGIC (PLACEMENT, INDIVIDUAL SCOPES) ───
    if (targetType) query.targetType = targetType;

    if (targetId && targetId !== "null" && targetId !== "undefined") {
      if (mongoose.Types.ObjectId.isValid(targetId)) {
        query.targetId = new mongoose.Types.ObjectId(targetId);
      } else {
        query.targetId = targetId;
      }
    }
  }

  // 3. Dynamic Unexpired Dates Rule Group Isolation Block
  query.$and = [
    {
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    },
  ];

  // 4. Cursor Pagination Execution
  const skip = (Number(page) - 1) * Number(limit);

  const [notices, total] = await Promise.all([
    Notice.find(query)
      .populate("createdBy", "firstName lastName role")
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Notice.countDocuments(query),
  ]);

  // console.log(notices);

  return sendResponse(res, 200, "Notices fetched safely.", {
    notices,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// ─── GET /api/notices/:id ─────────────────────────────────────────────────────
export const getNoticeById = asyncHandler(async (req, res) => {
  const notice = await Notice.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewCount: 1 } },
    { new: true },
  ).populate("createdBy", "firstName lastName role");

  if (!notice) {
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

  const isOwner = notice.createdBy.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "superadmin") {
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

  const isOwner = notice.createdBy.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "superadmin") {
    return res.status(403).json({ success: false, message: "Not authorised." });
  }

  notice.isArchived = true;
  await notice.save();
  sendResponse(res, 200, "Notice archived.");
});
