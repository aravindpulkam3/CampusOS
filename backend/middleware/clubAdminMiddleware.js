import Club from "../models/Club.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";

// Single source of the club-admin rule — reused by eventManagerMiddleware,
// event creation and announcement routes.
export const isClubAdmin = (club, user) =>
  club.clubAdmins.some((adminId) => adminId.toString() === user._id.toString());

// Resolves the club and enforces admin authority (Super Admin always passes).
// Throws ApiError; returns the club document.
export const assertClubAdmin = async (user, clubId) => {
  if (!clubId) {
    throw new ApiError(400, "Club ID is required.");
  }

  const club = await Club.findById(clubId);

  if (!club) {
    throw new ApiError(404, "Club not found.");
  }

  if (!club.isActive) {
    throw new ApiError(403, "Club is not active.");
  }

  if (!isClubAdmin(club, user) && user.role !== "superadmin") {
    throw new ApiError(403, "Access denied. You are not an admin of this club.");
  }

  return club;
};

// Expects clubId in req.params.clubId or req.body.clubId
const clubAdminMiddleware = asyncHandler(async (req, res, next) => {
  const clubId = req.params.clubId || req.body.clubId;
  req.club = await assertClubAdmin(req.user, clubId); // attach club so controller doesn't re-fetch
  next();
});

export default clubAdminMiddleware;
