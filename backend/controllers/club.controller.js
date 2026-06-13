import Club from "../models/Club.js";
import Event from "../models/Event.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import { Announcement } from "../models/Announcement.js";
import User from "../models/User.js";

export const getAllClubs = asyncHandler(async (req, res) => {
  const data = await Club.find();
  sendResponse(res, 200, "Clubs fetched successfully", data);
});

export const getClubDetails = asyncHandler(async (req, res) => {
  const clubId = req.params.clubId;
  const club = await Club.findById(clubId);
  if (!club) {
    return sendResponse(res, 404, "Club not found");
  }
  const isAdmin=club.clubAdmins.includes(req.user._id)||req.user.role==="superadmin"

  const events = await Event.find({
    organizerClub: clubId,
  })
    .sort({ date: 1 })
    .limit(5);

  const announcements = await Announcement.find({
    targetType: "club",
    club: clubId,
  })
    .sort({ createdAt: -1 })
    .limit(3);

  sendResponse(res, 200, "Club fetched Successfully", {
    club,
    events,
    announcements,
    isAdmin
  });
});

export const followClub = asyncHandler(async (req, res) => {
  const clubId = req.params.clubId;

  const club = await Club.findById(clubId);
  const user = await User.findById(req.user._id);

  if (!club) throw new ApiError(400, "Club not found");

  const alreadyFollowing =
    club.clubFollowers.some(
      (follower) => follower.toString() === req.user._id.toString(),
    ) ||
    user.followedClubs.some(
      (followedClub) => followedClub.toString() === clubId.toString(),
    );

  if (alreadyFollowing) {
    club.clubFollowers = club.clubFollowers.filter(
      (follower) => follower.toString() !== req.user._id.toString(),
    );
    user.followedClubs = user.followedClubs.filter(
      (followedClub) => followedClub.toString() !== clubId.toString(),
    );

    await club.save();
    await user.save();

    return sendResponse(res, 200, "Club unfollowed", {
      club,
      user,
      isFollowing: false,
    });
  }

  club.clubFollowers.push(req.user._id);
  user.followedClubs.push(clubId);

  await user.save();
  await club.save();

  sendResponse(res, 200, "Club followed", {
    club,
    user,
    isFollowing: true,
  });
});

export const getPopularClubs = asyncHandler(async (req, res) => {
  const clubs = await Club.find();

  clubs.sort(
    (a, b) =>
      b.clubFollowers.length -
      a.clubFollowers.length
  );

  sendResponse(
    res,
    200,
    "Popular clubs fetched",
    clubs.slice(0, 5)
  );
});
