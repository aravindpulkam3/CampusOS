// event controller
import Event from "../models/Event.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import ApiError from "../utils/apiError.js";
import { notifyClubFollowers, notifyEventRegistrants } from "../services/notification.service.js";
// TODO: implement controller function
export const createEvent = asyncHandler(async (req, res) => {
  const event = await Event.create({
    ...req.body,
    createdBy: req.user._id,
  });

  notifyClubFollowers(event.organizerClub, req.user._id, {
    type: "club_event",
    title: "New club event",
    message: `${event.eventName} was just posted.`,
    targetType: "event",
    targetId: event._id,
    createdBy: req.user._id,
  });

  sendResponse(res, 201, "Event created successfully", event);
});

export const getAllEvents = asyncHandler(async (req, res) => {
  const { category, search, offset = 0 } = req.query;
  const skipCount = Number(offset) || 0;
  const limitCount = 15;
  const now = new Date();

  // 1. Construct Dynamic Aggregate Filters
  const matchConditions = { status: { $ne: "Cancelled" } };
  
  if (category && category !== "All") {
    matchConditions.category = category;
  }

  if (search && search.trim() !== "") {
    const searchRegex = new RegExp(search.trim(), "i");
    matchConditions.$or = [
      { eventName: searchRegex },
      { venue: searchRegex },
      { category: searchRegex }
    ];
  }

  // 2. Fetch the target data map with uniform chronological priority sorting pipeline
  // Order: 1. Ongoing, 2. Upcoming (nearest first), 3. Completed (most recent first)
  const eventsPipeline = await Event.find(matchConditions)
    .populate("organizerClub", "clubName logo")
    .lean();

  const ongoing = [];
  const upcoming = [];
  const completed = [];

  eventsPipeline.forEach(event => {
    const start = new Date(event.startDateTime);
    const end = new Date(event.endDateTime);
    
    if (now >= start && now <= end) {
      ongoing.push(event);
    } else if (now < start) {
      upcoming.push(event);
    } else {
      completed.push(event);
    }
  });

  // Sort within chronological tiers
  upcoming.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime)); // Nearest upcoming first
  completed.sort((a, b) => new Date(b.endDateTime) - new Date(a.endDateTime));     // Most recently completed first

  const unifiedSortedFeed = [...ongoing, ...upcoming, ...completed];
  
  // 3. Apply Offset Array Slicing Constraints
  const paginatedResults = unifiedSortedFeed.slice(skipCount, skipCount + limitCount);
  const hasMore = skipCount + limitCount < unifiedSortedFeed.length;

  return sendResponse(res, 200, "Events synchronization synchronized successfully.", {
    events: paginatedResults,
    hasMore,
    nextOffset: skipCount + paginatedResults.length,
    totalRecords: unifiedSortedFeed.length
  });
});

export const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate("organizerClub", "clubName logo")
    .populate("createdBy", "firstName secondName");
    const isOrganizer=event.eventOrganizers.some(organizer=> organizer.equals(req.user._id));
  sendResponse(res, 200, "Events fetched Successfully",{
    event,
    isOrganizer
  } );
});

export const registerForEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  const user=await User.findById(req.user._id);

  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  if (
    event.eligibleBranches?.length > 0 &&
    !event.eligibleBranches.includes(req.user.branch)
  ) {
    throw new ApiError(403, "Your branch is not eligible for this event");
  }
  if (
    event.eligibleYears?.length > 0 &&
    !event.eligibleYears.includes(req.user.year)
  ) {
    throw new ApiError(403, "Your year is not eligible for this event");
  }
  const alreadyRegistered = user.registeredEvents.some(
    (registeredEvent) => registeredEvent.toString() === req.params.id.toString(),
  );

  if (alreadyRegistered) {
    throw new ApiError(400, "Already registered");
  }
  
  user.registeredEvents.push(req.params.id);

  await user.save();
  const updatedEvent = await Event.findByIdAndUpdate(req.params.id, { $inc: { registrationCount: 1 } }, { new: true });
  sendResponse(res, 201, "Registered Successfully", {user, event: updatedEvent});
});

export const getUpcomingEvents = asyncHandler(async (req, res) => {
  const now = new Date();

  const events = await Event.find({
    // Keeps events that are either currently running or haven't started yet
    endDateTime: { $gte: now },
  })
    .populate("organizerClub", "clubName logo")
    .sort({ startDateTime: 1 }) // Keeps the closest events at the top
    .limit(5);

  sendResponse(res, 200, "Upcoming and ongoing events fetched", events);
});

export const registeredEvents = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("registeredEvents");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  sendResponse(res, 200, "Registered events fetched", user.registeredEvents);
});

export const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params; 
  const updates = req.body;
  

  if (!id || id === "undefined") {
    return sendResponse(res, 400, "Invalid or missing Event ID parameter");
  }

  if (updates.startDateTime && updates.endDateTime) {
    if (new Date(updates.endDateTime) <= new Date(updates.startDateTime)) {
      return sendResponse(res, 400, "End date and time must be after the start timeline");
    }
  }

  const updatedEvent = await Event.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true } // Returns the newly modified object and fires schema validations
  );
  

  if (!updatedEvent) {
    return sendResponse(res, 404, "Target event configuration does not exist");
  }

  notifyEventRegistrants(updatedEvent._id, req.user._id, {
    type: "event_update",
    title: "Event updated",
    message: `${updatedEvent.eventName} was just updated.`,
    targetType: "event",
    targetId: updatedEvent._id,
    createdBy: req.user._id,
  });

  return sendResponse(res, 200, "Event parameters synced successfully", { event: updatedEvent });
});