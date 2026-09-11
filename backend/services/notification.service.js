import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Application from "../models/Application.js";
import { getIO } from "../sockets/socketHandler.js";

// ─── single error-handling boundary ───────────────────────────────────────────
// A notification is a side effect of some other action, never the action itself.
// Every fan-out/persistence function below is wrapped once, here, so a Socket.IO
// or DB hiccup on the notification path can never bubble up and fail the parent
// operation. Callers (controllers) call these plainly — no try/catch, no .catch().
const safe = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (err) {
    console.error("[notification service]", err);
  }
};

// ─── persistence + emit ────────────────────────────────────────────────────────

export const createNotification = safe(async ({ recipientId, ...fields }) => {
  const notification = await Notification.create({
    recipient: recipientId,
    ...fields,
  });
  getIO()?.to(`user:${recipientId}`).emit("notification:new", notification);
});

// Bulk-creates for many recipients in one insertMany (no N+1). If `sourceClub` is
// set, mute-filters against it — this is the ONLY place mutedClubs is consulted,
// so transactional/eligibility notifications (no sourceClub) can never be muted.
export const createNotificationsBulk = safe(
  async (recipientIds, { sourceClub = null, excludeUserId = null, ...fields }) => {
    let ids = [...new Set(recipientIds.map((id) => id.toString()))];
    if (excludeUserId) ids = ids.filter((id) => id !== excludeUserId.toString());
    if (!ids.length) return;

    if (sourceClub) {
      const eligible = await User.find({
        _id: { $in: ids },
        mutedClubs: { $ne: sourceClub },
      })
        .select("_id")
        .lean();
      ids = eligible.map((u) => u._id.toString());
      if (!ids.length) return;
    }

    const docs = ids.map((recipient) => ({
      recipient,
      sourceClub,
      ...fields,
    }));
    const created = await Notification.insertMany(docs);

    const io = getIO();
    if (io) {
      created.forEach((notif) =>
        io.to(`user:${notif.recipient}`).emit("notification:new", notif)
      );
    }
  }
);

// ─── recipient resolution ──────────────────────────────────────────────────────
// Each takes an ID (not a doc) and does its own lookup, so controllers stay a
// one-line addition. Only notifyClubFollowers passes sourceClub through — every
// other resolver is structurally incapable of being muted.

export const notifyClubFollowers = safe(async (clubId, actorId, fields) => {
  const followers = await User.find({ followedClubs: clubId }).select("_id").lean();
  if (!followers.length) return;
  await createNotificationsBulk(
    followers.map((f) => f._id),
    {
      ...fields,
      sourceClub: clubId,
      excludeUserId: actorId,
    }
  );
});

export const notifyEventRegistrants = safe(async (eventId, actorId, fields) => {
  const registrants = await User.find({ registeredEvents: eventId }).select("_id").lean();
  if (!registrants.length) return;
  await createNotificationsBulk(
    registrants.map((r) => r._id),
    {
      ...fields,
      excludeUserId: actorId,
    }
  );
});

// Targeted eligibility fan-out — matched by branch/CGPA/year criteria, not by
// personal action, and (like every non-club resolver) never mute-filtered.
export const notifyEligibleStudents = safe(async (drive, actorId, fields) => {
  const matchQuery = {
    role: "student",
    cgpa: { $gte: drive.minCGPA || 0 },
    year: { $gte: drive.minYear || 1, $lte: drive.maxYear || 4 },
  };
  if (drive.eligibleBranches?.length) {
    matchQuery.branch = { $in: drive.eligibleBranches };
  }

  const students = await User.find(matchQuery).select("_id").lean();
  await createNotificationsBulk(
    students.map((s) => s._id),
    { ...fields, excludeUserId: actorId }
  );
});

export const notifyDriveApplicants = safe(async (driveId, actorId, fields) => {
  const studentIds = await Application.find({ drive: driveId }).distinct("student");
  await createNotificationsBulk(studentIds, { ...fields, excludeUserId: actorId });
});

// Round-outcome notifications (shortlisted/rejected/selected) all reuse this
// one wrapper — they only ever differ by recipient list and message text,
// not by recipient-resolution logic, so a single function covers all of them
// (called twice per confirmShortlist, once per finishDrive).
export const notifyApplicationOutcome = safe(
  async (studentIds, { title, message, targetId }, actorId) => {
    if (!studentIds?.length) return;
    await createNotificationsBulk(studentIds, {
      type: "application_status",
      title,
      message,
      targetType: "drive",
      targetId,
      excludeUserId: actorId,
    });
  },
);

export const notifyClassroomStudents = safe(async (classroomId, actorId, fields) => {
  const students = await User.find({ classroom: classroomId }).select("_id").lean();
  if (!students.length) return;
  await createNotificationsBulk(
    students.map((s) => s._id),
    {
      ...fields,
      excludeUserId: actorId,
    }
  );
});

export const notifyAllUsers = safe(async (actorId, fields) => {
  const users = await User.find().select("_id").lean();
  await createNotificationsBulk(
    users.map((u) => u._id),
    { ...fields, excludeUserId: actorId }
  );
});

// ─── REST-facing queries ────────────────────────────────────────────────────────
// These back the notification.controller.js endpoints directly — errors here
// belong to the request they're serving, so they propagate normally (no `safe`).

export const getUserNotifications = async (userId, offset = 0) => {
  const limit = 15;
  const [notifications, total] = await Promise.all([
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipient: userId }),
  ]);

  const nextOffset = offset + notifications.length;
  return { notifications, hasMore: nextOffset < total, nextOffset };
};

export const getUnreadCount = (userId) =>
  Notification.countDocuments({ recipient: userId, isRead: false });

export const markAsRead = (userId, notificationId) =>
  Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true }
  );

export const markAllAsRead = (userId) =>
  Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
