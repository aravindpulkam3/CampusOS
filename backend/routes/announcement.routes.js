import express from "express";
import { createAnnouncement, deleteAnnouncement, getAnnouncements, getCommunityFeed } from "../controllers/announcement.controller.js";
import authMiddleware from "../middleware/authMiddleware.js"
import { assertClubAdmin } from "../middleware/clubAdminMiddleware.js";
import { assertEventManager } from "../middleware/eventManagerMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";

// Posting to a club needs club-admin rights; posting to an event needs the
// same authority as editing it.
const authorizeAnnouncementTarget = asyncHandler(async (req, res, next) => {
  const { targetType, targetId } = req.params;
  if (targetType === "club") await assertClubAdmin(req.user, targetId);
  else if (targetType === "event") await assertEventManager(req.user, targetId);
  else throw new ApiError(400, "Invalid target type");
  next();
});

const announcementRouter = express.Router();
// TODO: import controller and define routes
announcementRouter.post("/:targetType/:targetId",authMiddleware,authorizeAnnouncementTarget,createAnnouncement);
announcementRouter.get("/:targetType/:targetId",authMiddleware,getAnnouncements);
announcementRouter.get("/community",authMiddleware,getCommunityFeed);
announcementRouter.delete("/:id",authMiddleware,deleteAnnouncement);
export default announcementRouter;
