import express from "express";
import {
  createEvent,
  getAllEvents,
  getEventById,
  getUpcomingEvents,
  registerForEvent,
  unregisterFromEvent,
  updateEvent,
} from "../controllers/event.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import eventManagerMiddleware from "../middleware/eventManagerMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";
import { assertClubAdmin } from "../middleware/clubAdminMiddleware.js";

// Creating an event requires club-admin rights over the organizer club.
// organizerClub is in the request body, so we pull it from there.
const requireClubAdminForCreate = asyncHandler(async (req, res, next) => {
  await assertClubAdmin(req.user, req.body.organizerClub);
  next();
});

const eventRouter = express.Router();

eventRouter.get("/", authMiddleware, getAllEvents);
eventRouter.get("/upcoming", authMiddleware, getUpcomingEvents);
eventRouter.get("/:id", authMiddleware, getEventById);

// Club-admin guard at route level — mirrors the announcement/notice pattern.
eventRouter.post("/create", authMiddleware, requireClubAdminForCreate, createEvent);
eventRouter.put("/:id/update", authMiddleware, eventManagerMiddleware, updateEvent);
eventRouter.put("/:id/register", authMiddleware, registerForEvent);
eventRouter.delete("/:id/register", authMiddleware, unregisterFromEvent);

export default eventRouter;
