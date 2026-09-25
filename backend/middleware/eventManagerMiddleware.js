import Event from "../models/Event.js";
import Club from "../models/Club.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { isClubAdmin } from "./clubAdminMiddleware.js";

// Who may manage an event: Super Admin, a listed event organizer, or an admin
// of its organizer club. The one rule behind assertEventManager, getEventById's
// isOrganizer and event-notice posting.
export const canManageEvent = async (user, event) => {
  if (user.role === "superadmin") return true;
  if (event.eventOrganizers?.some((organizerId) => organizerId.equals(user._id))) {
    return true;
  }
  // organizerClub may arrive populated.
  const clubId = event.organizerClub?._id ?? event.organizerClub;
  const club = await Club.findById(clubId).select("clubAdmins");
  return !!club && isClubAdmin(club, user);
};

// Throws ApiError; returns the event document.
export const assertEventManager = async (user, eventId) => {
  const event = await Event.findById(eventId);

  if (!event) {
    throw new ApiError(404, "Event not found.");
  }

  if (await canManageEvent(user, event)) return event;

  throw new ApiError(403, "Access denied. You cannot manage this event.");
};

// Expects the event id in req.params.id; attaches req.event.
const eventManagerMiddleware = asyncHandler(async (req, res, next) => {
  req.event = await assertEventManager(req.user, req.params.id);
  next();
});

export default eventManagerMiddleware;
