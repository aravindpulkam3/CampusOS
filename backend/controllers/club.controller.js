import Club from "../models/Club.js";
import Event from "../models/Event.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import { Announcement } from "../models/Announcement.js";
import User from "../models/User.js";
import { getJSON, setJSON, del } from "../utils/cache.js";

const ALL_CLUBS_CACHE_KEY = "cache:clubs:all";
const ALL_CLUBS_TTL = 60 * 60 * 24; // 24h
const POPULAR_CLUBS_CACHE_KEY = "cache:clubs:popular";
const POPULAR_CLUBS_TTL = 60 * 60; // 1h

export const getAllClubs = asyncHandler(async (req, res) => {
  const cached = await getJSON(ALL_CLUBS_CACHE_KEY);
  if (cached) {
    console.log("Serving clubs from cache");
    return sendResponse(res, 200, "Clubs fetched successfully", cached);
  }

  const data = await Club.find().lean();
  await setJSON(ALL_CLUBS_CACHE_KEY, data, ALL_CLUBS_TTL);
  sendResponse(res, 200, "Clubs fetched successfully", data);
});

export const createClub = asyncHandler(async (req, res) => {
  const { clubName, description, category, logo, banner } = req.body;

  if (!clubName?.trim() || !description?.trim() || !category) {
    throw new ApiError(400, "Club name, description, and category are required.");
  }

  const club = await Club.create({
    clubName: clubName.trim(),
    description: description.trim(),
    category,
    logo: logo || null,
    banner: banner || null,
    isActive: true,
  });

  await del(ALL_CLUBS_CACHE_KEY);
  await del(POPULAR_CLUBS_CACHE_KEY);

  sendResponse(res, 201, "Club created successfully.", club);
});

export const getClubDetails = asyncHandler(async (req, res) => {
  const clubId = req.params.clubId;
  const club = await Club.findById(clubId).lean();
  if (!club) {
    return sendResponse(res, 404, "Club not found");
  }
  const isAdmin =
    club.clubAdmins.some((adminId) => adminId.toString() === req.user._id.toString()) ||
    req.user.role === "superadmin";

  const events = await Event.find({
    organizerClub: clubId,
  })
    .sort({ date: 1 })
    .limit(5);

  const announcements = await Announcement.find({
    targetType: "club",
    club: clubId,
  })
    .populate("postedBy", "firstName lastName")
    .sort({ createdAt: -1 })
    .limit(3);

  sendResponse(res, 200, "Club fetched Successfully", {
    club,
    events,
    announcements,
    isAdmin,
  });
});

export const followClub = asyncHandler(async (req, res) => {
  const clubId = req.params.clubId;

  const club = await Club.findById(clubId);
  const user = await User.findById(req.user._id);

  if (!club) throw new ApiError(400, "Club not found");

  const alreadyFollowing = user.followedClubs.some(
    (followedClub) => followedClub.toString() === clubId.toString(),
  );

  if (alreadyFollowing) {
    user.followedClubs = user.followedClubs.filter(
      (followedClub) => followedClub.toString() !== clubId.toString(),
    );

    await user.save();
    const updatedClub = await Club.findByIdAndUpdate(clubId, { $inc: { followerCount: -1 } }, { new: true });

    return sendResponse(res, 200, "Club unfollowed", {
      club: updatedClub,
      user,
      isFollowing: false,
    });
  }

  user.followedClubs.push(clubId);

  await user.save();
  const updatedClub = await Club.findByIdAndUpdate(clubId, { $inc: { followerCount: 1 } }, { new: true });

  sendResponse(res, 200, "Club followed", {
    club: updatedClub,
    user,
    isFollowing: true,
  });
});

export const toggleMuteClub = asyncHandler(async (req, res) => {
  const clubId = req.params.clubId;

  const club = await Club.findById(clubId);
  if (!club) throw new ApiError(404, "Club not found");

  const user = await User.findById(req.user._id);

  const isMuted = user.mutedClubs.some(
    (mutedClub) => mutedClub.toString() === clubId.toString(),
  );

  if (isMuted) {
    user.mutedClubs = user.mutedClubs.filter(
      (mutedClub) => mutedClub.toString() !== clubId.toString(),
    );
    await user.save();
    return sendResponse(res, 200, "Club notifications unmuted", { isMuted: false });
  }

  user.mutedClubs.push(clubId);
  await user.save();

  sendResponse(res, 200, "Club notifications muted", { isMuted: true });
});

export const getPopularClubs = asyncHandler(async (req, res) => {
  const cached = await getJSON(POPULAR_CLUBS_CACHE_KEY);
  if (cached) {
    return sendResponse(res, 200, "Popular clubs fetched", cached);
  }

  const clubs = await Club.find()
    .sort({ followerCount: -1 })
    .limit(5)
    .lean();

  await setJSON(POPULAR_CLUBS_CACHE_KEY, clubs, POPULAR_CLUBS_TTL);
  sendResponse(res, 200, "Popular clubs fetched", clubs);
});

export const updateClub = asyncHandler(async (req, res) => {
  const { clubId } = req.params;
  const { clubName, description, category, logo, banner, isActive, adminIds } =
    req.body;

  const currentUser = req.user; // Appended by your authentication verifyJWT middleware

  // 1. Fetch target club record with existing admins pre-populated
  const club = await Club.findById(clubId);
  if (!club) {
    throw new ApiError(404, "Target club resource could not be found.");
  }

  // 2. Role-Based Access Control (RBAC) Guard Verification
  const isSuperAdmin = currentUser.role === "superadmin";
  const isClubAdmin = club.clubAdmins.some(
    (adminId) => adminId.toString() === currentUser._id.toString(),
  );

  if (!isSuperAdmin && !isClubAdmin) {
    throw new ApiError(
      403,
      "Access Denied: You do not have permissions to modify this club.",
    );
  }

  // 3. Build Safe Modification Updates Sandbox Object
  const updates = {};

  if (clubName !== undefined) updates.clubName = clubName.trim();
  if (description !== undefined) updates.description = description.trim();
  if (category !== undefined) updates.category = category;

  // Handle empty string or explicit null assignments for Cloudinary media pointers
  if (logo !== undefined) updates.logo = logo?.trim() || null;
  if (banner !== undefined) updates.banner = banner?.trim() || null;

  // 4. Structural Security Restriction Overrides
  // ONLY Super Admins can alter a club's active state or swap structural admin permissions
  if (isSuperAdmin) {
    if (isActive !== undefined) updates.isActive = isActive;
  } else {
    // If a regular Club Admin tries to pass these fields, silently ignore them or throw an explicit rejection
    if (isActive !== undefined && isActive !== club.isActive) {
      throw new ApiError(
        403,
        "Privilege Escalation Blocked: Only Super Admins can alter application activation visibility status.",
      );
    }
  }

  // 5. Execute Atomic Database Updates Mutation
  const updatedClub = await Club.findByIdAndUpdate(
    clubId,
    { $set: updates },
    {
      new: true, // Returns the freshly updated document configuration item map
      runValidators: true, // Enforces your Mongoose schema layout safety checks
    },
  );

  await del(ALL_CLUBS_CACHE_KEY);
  await del(POPULAR_CLUBS_CACHE_KEY);

  sendResponse(
    res,
    200,
    "Club properties committed and synchronized successfully.",
    updatedClub,
  );
});
