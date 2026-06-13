import express from "express";
import {
  followClub,
  getAllClubs,
  getClubDetails,
  getPopularClubs,
} from "../controllers/club.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const clubRouter = express.Router();

clubRouter.get("/", authMiddleware, getAllClubs);
clubRouter.get("/popular",authMiddleware,getPopularClubs);
clubRouter.get("/:clubId", authMiddleware, getClubDetails);
clubRouter.put("/:clubId/follow",authMiddleware, followClub);

export default clubRouter;
