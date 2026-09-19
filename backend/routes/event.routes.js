import express from "express";
import {
  createEvent,
  getAllEvents,
  getEventById,
  getUpcomingEvents,
  registerForEvent,
  updateEvent,
} from "../controllers/event.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import eventManagerMiddleware from "../middleware/eventManagerMiddleware.js";
const eventRouter = express.Router();
// TODO: import controller and define routes
eventRouter.get("/", authMiddleware, getAllEvents);
// Club-admin check for creation lives in the controller, bound to the exact
// organizerClub being written (assertClubAdmin).
eventRouter.post("/create", authMiddleware, createEvent);
eventRouter.put("/:id/update", authMiddleware, eventManagerMiddleware, updateEvent);
eventRouter.get("/upcoming", authMiddleware, getUpcomingEvents);
eventRouter.get("/:id", authMiddleware, getEventById);
eventRouter.put("/:id/register", authMiddleware, registerForEvent);

export default eventRouter;
