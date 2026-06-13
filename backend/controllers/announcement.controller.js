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

  console.log(targetType);

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
    }).sort({ createdAt: -1 });
  } else if (targetType === "event") {
    data = await Announcement.find({
      targetType: "event",
      event: targetId,
    }).sort({ createdAt: -1 });
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
    .sort({ createdAt: -1 });

  // Updates from registered events
  const eventAnnouncements = await Announcement.find({
    targetType: "event",
    event: { $in: registeredEventIds },
  })
    .populate("event", "eventName")
    .sort({ createdAt: -1 });

  // General announcements for discovery
  const generalAnnouncements = await Announcement.find()
    .populate("club", "clubName")
    .populate("event", "eventName")
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
  );

  // Sort newest first
  uniqueFeed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  sendResponse(res, 200, "Community feed fetched successfully", uniqueFeed);
});
