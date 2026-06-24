// announcement controller

import asyncHandler from "../utils/asyncHandler.js";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import { Announcement } from "../models/Announcement.js";
import sendResponse from "../utils/sendResponse.js";
import ApiError from "../utils/apiError.js";
// TODO: implement controller functions
export const createAnnouncement = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.params;
  const { title, body, image } = req.body;


  if (!targetType) {
    throw new ApiError(400, "Invalid target type");
  }

  const announcementData = {
    title,
    body,
    image,
    postedBy: req.user._id,
    targetType: targetType,
  };

  if (targetType === "club") {
    announcementData.club = targetId;
  }

  if (targetType === "event") {
    announcementData.event = targetId;
  }

  const announcement = await Announcement.create(announcementData);

  sendResponse(res, 201, "announcement created", announcement);
});

export const getAnnouncements = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.params;

  let data;

  if (targetType === "club") {
    data = await Announcement.find({
      targetType: "club",
      club: targetId,
    })
      .populate("postedBy", "firstName lastName")
      .sort({ createdAt: -1 });
  } else if (targetType === "event") {
    data = await Announcement.find({
      targetType: "event",
      event: targetId,
    })
      .populate("postedBy", "firstName lastName")
      .sort({ createdAt: -1 });
  } else {
    throw new ApiError(400, "Invalid target type");
  }

  sendResponse(res, 200, "Announcements fetched successfully", data);
});

export const getCommunityFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Clubs user follows
  const followedClubs = await Club.find({
    clubFollowers: userId,
  }).select("_id");

  const followedClubIds = followedClubs.map((club) => club._id);

  // Events user registered for
  const registeredEvents = await Event.find({
    registeredStudents: userId,
  }).select("_id");

  const registeredEventIds = registeredEvents.map((event) => event._id);

  // Announcements from followed clubs
  const clubAnnouncements = await Announcement.find({
    targetType: "club",
    club: { $in: followedClubIds },
  })
    .populate("club", "clubName")
    .populate("postedBy", "firstName lastName")
    .sort({ createdAt: -1 });

  // Updates from registered events
  const eventAnnouncements = await Announcement.find({
    targetType: "event",
    event: { $in: registeredEventIds },
  })
    .populate("event", "eventName")
    .populate("postedBy", "firstName lastName")
    .sort({ createdAt: -1 });

  // General announcements for discovery
  const generalAnnouncements = await Announcement.find()
    .populate("club", "clubName")
    .populate("event", "eventName")
    .populate("postedBy", "firstName lastName")
    .sort({ createdAt: -1 })
    .limit(20);

  // Merge
  const feed = [
    ...eventAnnouncements,
    ...clubAnnouncements,
    ...generalAnnouncements,
  ];

  // Remove duplicates
  const uniqueFeed = Array.from(
    new Map(
      feed.map((announcement) => [announcement._id.toString(), announcement]),
    ).values(),
  ).filter((announcement) => {
    // Defensive Guard: If targetType is event but event is null, it was deleted. Drop it.
    if (announcement.targetType === "event" && !announcement.event)
      return false;
    // If targetType is club but club is null, it was deleted. Drop it.
    if (announcement.targetType === "club" && !announcement.club) return false;

    return true;
  });

  // Sort newest first
  uniqueFeed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  sendResponse(res, 200, "Community feed fetched successfully", uniqueFeed);
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user; // Populated by your authentication middleware

  if (!id || id === "undefined") {
    return sendResponse(res, 400, "Invalid or missing ID parameter");
  }

  // 1. Fetch the announcement to check context properties
  const announcement = await Announcement.findById(id);
  if (!announcement) {
    return sendResponse(res, 404, "Announcement does not exist");
  }

  // 2. Base Authorization Checks (Superadmin or Creator)
  const isSuperAdmin = user.role === "superadmin";
  const isAuthor = announcement.postedBy.toString() === user._id.toString();
  
  let isAuthorizedManager = false;

  // 3. Contextual Authority Check (Club Admin array check)
  if (announcement.targetType === "club" && announcement.club) {
    const club = await Club.findById(announcement.club);
    if (club && club.clubAdmin) {
      isAuthorizedManager = club.clubAdmin.some(
        (adminId) => adminId.toString() === user._id.toString()
      );
    }
  }

  // 4. Contextual Authority Check (Event Organizers array check)
  if (announcement.targetType === "event" && announcement.event) {
    const event = await Event.findById(announcement.event);
    if (event && event.eventOrganizers) {
      isAuthorizedManager = event.eventOrganizers.some(
        (organizerId) => organizerId.toString() === user._id.toString()
      );
    }
  }

  // 5. Enforce final gatekeeping block
  if (!isSuperAdmin && !isAuthor && !isAuthorizedManager) {
    return sendResponse(res, 403, "Forbidden: You are not authorized to delete this announcement");
  }

  // 6. Execution Block
  await announcement.deleteOne();

  return sendResponse(res, 200, "Deleted successfully", announcement);
});
