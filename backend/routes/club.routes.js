import express from "express";
import {
  createClub,
  followClub,
  unfollowClub,
  getAllClubs,
  getClubDetails,
  getPopularClubs,
  muteClub,
  unmuteClub,
  updateClub,
} from "../controllers/club.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const clubRouter = express.Router();

const isSuperAdmin = roleMiddleware("superadmin");

clubRouter.get("/", authMiddleware, getAllClubs);
clubRouter.post("/", authMiddleware, isSuperAdmin, createClub);
clubRouter.get("/popular",authMiddleware,getPopularClubs);
clubRouter.get("/:clubId", authMiddleware, getClubDetails);
// PUT sets, DELETE clears — idempotent, never a toggle.
clubRouter.put("/:clubId/follow", authMiddleware, followClub);
clubRouter.delete("/:clubId/follow", authMiddleware, unfollowClub);
clubRouter.put("/:clubId/mute", authMiddleware, muteClub);
clubRouter.delete("/:clubId/mute", authMiddleware, unmuteClub);
clubRouter.put("/:clubId/update",authMiddleware,updateClub);

export default clubRouter;
