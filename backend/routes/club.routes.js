import express from "express";
import {
  createClub,
  followClub,
  getAllClubs,
  getClubDetails,
  getPopularClubs,
  toggleMuteClub,
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
clubRouter.put("/:clubId/follow",authMiddleware, followClub);
clubRouter.put("/:clubId/mute",authMiddleware, toggleMuteClub);
clubRouter.put("/:clubId/update",authMiddleware,updateClub);

export default clubRouter;
