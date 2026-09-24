import Club from "../models/Club.js";
import Event from "../models/Event.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import User from "../models/User.js";
import { getJSON, setJSON, del } from "../utils/cache.js";
import { withTransaction } from "../utils/transaction.js";

const ALL_CLUBS_CACHE_KEY = "cache:clubs:all";
const ALL_CLUBS_TTL = 60 * 60 * 24; // 24h
const POPULAR_CLUBS_CACHE_KEY = "cache:clubs:popular";
const POPULAR_CLUBS_TTL = 60 * 60; // 1h

export const getAllClubs = asyncHandler(async (req, res) => {
  const cached = await getJSON(ALL_CLUBS_CACHE_KEY);
  if (cached) {
    return sendResponse(res, 200, "Clubs fetched successfully", cached);
  }

  const data = await Club.find().lean();
  await setJSON(ALL_CLUBS_CACHE_KEY, data, ALL_CLUBS_TTL);
  sendResponse(res, 200, "Clubs fetched successfully", data);
});

export const createClub = asyncHandler(async (req, res) => {
  const { clubName, description, category, logo, banner } = req.body;

  if (!clubName?.trim() || !description?.trim() || !category) {
    throw new ApiError(
      400,
      "Club name, description, and category are required.",
    );
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

// Only what the club page's event rows render.
const CLUB_EVENT_FIELDS =
  "eventName startDateTime endDateTime registrationDeadline venue category status banner";
// A club has few live events; the cap only guards against pathological data.
const CLUB_UPCOMING_EVENTS_LIMIT = 50;
const CLUB_PAST_EVENTS_LIMIT = 3;

// Announcements are not included: the page pages through them via
// GET /announcements/club/:clubId.
export const getClubDetails = asyncHandler(async (req, res) => {
  const clubId = req.params.clubId;
  const club = await Club.findById(clubId)
    .populate("clubAdmins", "firstName lastName profilePicture")
    .lean();
  if (!club) {
    throw new ApiError(404, "Club not found");
  }
  const isAdmin =
    req.user.role === "superadmin" ||
    club.clubAdmins.some(
      (admin) => admin._id.toString() === req.user._id.toString(),
    );

  // Upcoming includes ongoing events (not yet ended), nearest first; past is
  // only the most recently finished few, plus a count for "latest N of M".
  const now = new Date();
  const upcomingFilter = { organizerClub: clubId, endDateTime: { $gte: now } };
  const pastFilter = { organizerClub: clubId, endDateTime: { $lt: now } };
  const [upcomingEvents, pastEvents, pastEventCount] = await Promise.all([
    Event.find(upcomingFilter)
      .select(CLUB_EVENT_FIELDS)
      .sort({ startDateTime: 1, _id: 1 })
      .limit(CLUB_UPCOMING_EVENTS_LIMIT)
      .lean(),
    Event.find(pastFilter)
      .select(CLUB_EVENT_FIELDS)
      .sort({ endDateTime: -1, _id: -1 })
      .limit(CLUB_PAST_EVENTS_LIMIT)
      .lean(),
    Event.countDocuments(pastFilter),
  ]);

  sendResponse(res, 200, "Club fetched Successfully", {
    club,
    isAdmin,
    upcomingEvents,
    pastEvents,
    pastEventCount,
  });
});

// Follow and mute are SET, never toggled: PUT follows/mutes, DELETE undoes it.
// $addToSet/$pull are idempotent, so repeated or parallel requests converge on
// the requested state instead of flipping it.
//
// Following is stored twice — User.followedClubs (membership) and
// Club.followerCount (count) — so both writes run in ONE transaction and the
// count moves only when membership actually changed. Any failure, including
// the club vanishing after the caller's existence check, rolls both back.
//
// The membership condition is in the FILTER, not inferred from modifiedCount:
// User has timestamps, so Mongoose adds $set:{updatedAt} to every update and
// modifiedCount is 1 even when $addToSet/$pull changed nothing.
export const setClubFollow = (userId, clubId, follow) =>
  withTransaction(async (session) => {
    const membership = await User.updateOne(
      follow
        ? { _id: userId, followedClubs: { $ne: clubId } }
        : { _id: userId, followedClubs: clubId },
      follow
        ? { $addToSet: { followedClubs: clubId } }
        : { $pull: { followedClubs: clubId } },
      { session },
    );
    if (membership.matchedCount === 0) {
      // Already in the requested state — or the user no longer exists.
      if (!(await User.exists({ _id: userId }).session(session))) {
        throw new ApiError(404, "User not found");
      }
      return;
    }

    const counter = await Club.updateOne(
      { _id: clubId },
      { $inc: { followerCount: follow ? 1 : -1 } },
      { session },
    );
    if (counter.matchedCount === 0) throw new ApiError(404, "Club not found");
  });

const followHandler = (follow) =>
  asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    if (!(await Club.exists({ _id: clubId }))) throw new ApiError(404, "Club not found");

    await setClubFollow(req.user._id, clubId, follow);
    await del(ALL_CLUBS_CACHE_KEY);
    await del(POPULAR_CLUBS_CACHE_KEY);

    const [club, user] = await Promise.all([
      Club.findById(clubId),
      User.findById(req.user._id),
    ]);
    sendResponse(res, 200, follow ? "Club followed" : "Club unfollowed", {
      club,
      user,
      isFollowing: follow,
    });
  });

// PUT / DELETE /api/clubs/:clubId/follow
export const followClub = followHandler(true);
export const unfollowClub = followHandler(false);

const muteHandler = (mute) =>
  asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    if (!(await Club.exists({ _id: clubId }))) throw new ApiError(404, "Club not found");

    await User.updateOne(
      { _id: req.user._id },
      mute ? { $addToSet: { mutedClubs: clubId } } : { $pull: { mutedClubs: clubId } },
    );
    sendResponse(res, 200, mute ? "Club notifications muted" : "Club notifications unmuted", {
      isMuted: mute,
    });
  });

// PUT / DELETE /api/clubs/:clubId/mute
export const muteClub = muteHandler(true);
export const unmuteClub = muteHandler(false);

export const getPopularClubs = asyncHandler(async (req, res) => {
  const cached = await getJSON(POPULAR_CLUBS_CACHE_KEY);
  if (cached) {
    return sendResponse(res, 200, "Popular clubs fetched", cached);
  }

  const clubs = await Club.find().sort({ followerCount: -1 }).limit(5).lean();

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
  // Same rule as assertClubAdmin: an inactive club is frozen for its admins;
  // only a superadmin (who controls activation) may still edit it.
  if (!isSuperAdmin && !club.isActive) {
    throw new ApiError(403, "Club is not active.");
  }

  // Type checks before any .trim(): a non-string here used to throw a TypeError (500).
  // logo/banner keep accepting null/"" to mean "remove".
  for (const [field, value] of Object.entries({ clubName, description })) {
    if (value !== undefined && typeof value !== "string") {
      throw new ApiError(400, `Invalid value for ${field}`);
    }
  }
  for (const [field, value] of Object.entries({ logo, banner })) {
    if (value && typeof value !== "string") {
      throw new ApiError(400, `Invalid value for ${field}`);
    }
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
