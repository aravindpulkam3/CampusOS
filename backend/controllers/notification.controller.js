import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../services/notification.service.js";

// ─── GET /api/notifications ────────────────────────────────────────────────────
export const getNotifications = asyncHandler(async (req, res) => {
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const { notifications, hasMore, nextOffset } = await getUserNotifications(
    req.user._id,
    offset
  );
  sendResponse(res, 200, "Notifications fetched.", {
    notifications,
    hasMore,
    nextOffset,
  });
});

// ─── GET /api/notifications/unread-count ───────────────────────────────────────
export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const count = await getUnreadCount(req.user._id);
  sendResponse(res, 200, "Unread count fetched.", { count });
});

// ─── PATCH /api/notifications/:id/read ─────────────────────────────────────────
export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await markAsRead(req.user._id, req.params.id);
  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found." });
  }
  sendResponse(res, 200, "Notification marked as read.", notification);
});

// ─── PATCH /api/notifications/read-all ─────────────────────────────────────────
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await markAllAsRead(req.user._id);
  sendResponse(res, 200, "All notifications marked as read.");
});
