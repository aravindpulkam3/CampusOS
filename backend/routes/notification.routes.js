import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notification.controller.js";

const notificationRouter = express.Router();

notificationRouter.get("/", authMiddleware, getNotifications);
notificationRouter.get("/unread-count", authMiddleware, getUnreadNotificationCount);
notificationRouter.patch("/:id/read", authMiddleware, markNotificationRead);
notificationRouter.patch("/read-all", authMiddleware, markAllNotificationsRead);

export default notificationRouter;
