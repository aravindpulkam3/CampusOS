import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import ApiError from "../utils/apiError.js";
import { isHttpUrl } from "../utils/validateUrl.js";
import {
  requestAccountClaim,
  verifyAccountClaim,
  loginUser,
  refreshSession,
  logoutSession,
  logoutAllSessions,
  changeUserPassword,
  requestPasswordReset,
  resetUserPassword,
  setAuthCookies,
  clearAuthCookies,
  getProfileData
} from "../services/auth.service.js";
import User from "../models/User.js";

const CLAIM_SENT_MESSAGE =
  "If this address is on the college roster, an activation link has been sent to it.";

// "Claim your account": step 1 of signup. Only the college email is accepted —
// identity and cohort come from the roster. The response is identical for
// every address (on the roster or not, active or not), so it reveals nothing.
export const signup = asyncHandler(async (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== "string" || !email.trim()) {
    throw new ApiError(400, "Enter your college email address.");
  }

  await requestAccountClaim(email);
  sendResponse(res, 200, CLAIM_SENT_MESSAGE);
});

// Step 2: the emailed token proves ownership of the roster email; the user
// sets their password here (the service checks it against the password rule).
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token, password } = req.body ?? {};
  if (typeof token !== "string" || !token) {
    throw new ApiError(400, "This link is invalid or has expired. Request a new one.");
  }

  await verifyAccountClaim(token, password);
  sendResponse(res, 200, "Account activated. You can now sign in.");
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};

  // Strings only: an object such as {"$regex": "."} would otherwise become a
  // Mongo operator in the user lookup.
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required." });
  }

  const { user, accessToken, refresh } = await loginUser(
    email,
    password,
    req.get("user-agent"),
  );

  setAuthCookies(res, { accessToken, refresh });

  sendResponse(res, 200, "Login successful.", {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    branch: user.branch,
    year: user.year,
    section: user.section,
    rollNumber: user.rollNumber,
    cgpa: user.cgpa,
    followedClubs: user.followedClubs,
    mutedClubs: user.mutedClubs,
    registeredEvents: user.registeredEvents,
    classroom:user.classroom,
    profilePicture: user.profilePicture,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  let tokens;
  try {
    tokens = await refreshSession(req.cookies?.refreshToken);
  } catch (err) {
    // A rejected refresh token is dead for good — drop the cookies with it.
    clearAuthCookies(res);
    throw err;
  }

  setAuthCookies(res, tokens);
  sendResponse(res, 200, "Token refreshed.");
});

// No authMiddleware: logging out must work with an expired access token.
export const logout = asyncHandler(async (req, res) => {
  await logoutSession(req.cookies?.refreshToken);
  clearAuthCookies(res);
  sendResponse(res, 200, "Logged out successfully.");
});

export const logoutAll = asyncHandler(async (req, res) => {
  await logoutAllSessions(req.user._id);
  clearAuthCookies(res);
  sendResponse(res, 200, "Logged out of all devices.");
});

// Revokes every refresh session, this device's included, so this device signs
// in again now; other devices once their current access token expires.
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  await changeUserPassword(req.user._id, currentPassword, newPassword);
  clearAuthCookies(res);
  sendResponse(res, 200, "Password changed. Please sign in again.");
});

const RESET_SENT_MESSAGE =
  "If an account exists for this address, a password reset link has been sent to it.";

// Same response for every address, so it reveals nothing about accounts.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== "string" || !email.trim()) {
    throw new ApiError(400, "Enter your college email address.");
  }

  await requestPasswordReset(email);
  sendResponse(res, 200, RESET_SENT_MESSAGE);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body ?? {};
  if (typeof token !== "string" || !token) {
    throw new ApiError(400, "This link is invalid or has expired. Request a new one.");
  }

  await resetUserPassword(token, password);
  sendResponse(res, 200, "Password reset. You can now sign in.");
});

export const getMe = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "User fetched.", req.user);
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await getProfileData(req.user._id);

  sendResponse(
    res,
    200,
    "Profile fetched successfully",
    profile
  );
});

export const updateProfile = asyncHandler(async (req, res) => {
  // 1. Identify the logged-in user from the authentication middleware
  const userId = req.user?._id; 
  
  if (!userId) {
    throw new ApiError(401, "Unauthorized: User session not found");
  }

  // 2. Extract allowed fields from body to prevent malicious parameter injection
  const {
    profilePicture,
    bio,
    github,
    linkedin,
    portfolio,
    resumeUrl,
  } = req.body ?? {};

  // CGPA and backlogs enforce drive eligibility, so they are authoritative
  // data owned by the placement office (roster import / academics endpoint).
  // Students may not set them — refuse explicitly rather than ignore silently.
  if (req.body?.cgpa !== undefined || req.body?.backlogs !== undefined) {
    throw new ApiError(
      403,
      "CGPA and backlogs are maintained by the placement office and can't be edited here.",
    );
  }

  // Names are identity, taken from the roster like roll number and cohort:
  // a self-chosen name could impersonate staff in discussions or carry a
  // formula into coordinator CSV exports.
  if (req.body?.firstName !== undefined || req.body?.lastName !== undefined) {
    throw new ApiError(403, "Your name comes from the college roster and can't be edited here.");
  }

  // Type checks before any .trim(): a non-string here used to throw a TypeError (500).
  // Link fields keep accepting null/"" to mean "clear this value".
  for (const [field, value] of Object.entries({ bio, profilePicture })) {
    if (value !== undefined && typeof value !== "string") {
      throw new ApiError(400, `Invalid value for ${field}`);
    }
  }
  for (const [field, value] of Object.entries({ github, linkedin, portfolio, resumeUrl })) {
    if (value && typeof value !== "string") {
      throw new ApiError(400, `Invalid value for ${field}`);
    }
  }

  // 3. URL format validation: http(s) only — these render as links/images,
  // and new URL() alone would accept javascript: and data: URLs.
  if (github && !isHttpUrl(github)) throw new ApiError(400, "Invalid GitHub URL format");
  if (linkedin && !isHttpUrl(linkedin)) throw new ApiError(400, "Invalid LinkedIn URL format");
  if (portfolio && !isHttpUrl(portfolio)) throw new ApiError(400, "Invalid Portfolio URL format");
  if (resumeUrl && !isHttpUrl(resumeUrl)) throw new ApiError(400, "Invalid Resume asset URL format");
  if (profilePicture && !isHttpUrl(profilePicture)) throw new ApiError(400, "Invalid profile picture URL format");

  // 4. Construct update object dynamically based on what was passed
 // ─── Safely Construct Update Object ──────────────────────────
  const updateData = {};

  if (bio !== undefined) updateData.bio = bio.trim();

  // Protect optional social values by checking if they exist before trimming
  if (profilePicture !== undefined) updateData.profilePicture = profilePicture.trim();
  if (github !== undefined) updateData.github = github ? github.trim() : "";
  if (linkedin !== undefined) updateData.linkedin = linkedin ? linkedin.trim() : "";
  if (portfolio !== undefined) updateData.portfolio = portfolio ? portfolio.trim() : "";
  if (resumeUrl !== undefined) updateData.resumeUrl = resumeUrl ? resumeUrl.trim() : "";

  // 5. Execute update query against database
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { 
      new: true,           // Returns the modified document rather than the old one
      runValidators: true, // Forces Mongoose schema validators to re-fire on updates
      select: "-password"  // Ensures the hashed password remains private
    }
  );

  if (!updatedUser) {
    throw new ApiError(404, "User profile record does not exist");
  }

  // 6. Success: Send fresh payload back up to frontend profile state
  return sendResponse(res, 200, "Profile updated successfully", updatedUser);
});
