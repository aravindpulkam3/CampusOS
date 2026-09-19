import User from "../models/User.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";
import Classroom from "../models/Classroom.js"
import Discussion from "../models/Discussion.js";
import Application from "../models/Application.js";
import { findClassroomForUser } from "./classroom.service.js";
import ApiError from "../utils/apiError.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

const ACCESS_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const registerUser = async (userData) => {
  const {
    firstName, lastName, email, password,
    branch, year, section, rollNumber, cgpa, batch,
  } = userData;

  const existingUser = await User.findOne({ $or: [{ email }, { rollNumber }] });
  if (existingUser) {
    const field = existingUser.email === email ? "Email" : "Roll number";
    throw new ApiError(409, `${field} already registered.`);
  }

  const user = await User.create({
    firstName, lastName, email, password,
    branch, year, section, rollNumber, batch,
    // `?? null`, not `|| 0` — a blank CGPA at signup means "not provided yet",
    // not "zero". Storing 0 here is what made eligibility silently unfilterable.
    // Backlogs is placement-profile data and is collected from Profile, not signup.
    cgpa: cgpa ?? null,
  });

  // Read-only lookup — a Classroom must already exist (admin-created) for
  // this cohort. No match just means the student stays unassigned until an
  // admin creates the matching classroom, which backfills them then.
  const classroom = await findClassroomForUser({ branch, batch, section });
  if (classroom) {
    user.classroom = classroom._id;
    await user.save({ validateBeforeSave: false });
  }

  return user;
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email }).select("+password +refreshToken");//Doesn't return password and refreshtoken by default so we have to do that

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Strip sensitive fields before returning
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken;

  return { user: userObj, accessToken, refreshToken };
};

export const refreshAccessToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new ApiError(401, "No refresh token.");
  }

  let decoded;
  try {
    const jwt = await import("jsonwebtoken");
    decoded = jwt.default.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token reuse detected or user not found.");
  }

  // Rotate: issue new pair
  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  return { newAccessToken, newRefreshToken };
};

export const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

export const getProfileData = async (userId) => {
  // Fetch user first (needed for classroom & populated arrays)
  const user = await User.findById(userId)
    .select(
      "firstName lastName email rollNumber branch year section cgpa backlogs batch role profilePicture createdAt classroom followedClubs registeredEvents"
    )
    .populate("followedClubs", "clubName logo")
    .populate("registeredEvents", "eventName venue startDateTime")
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Run independent queries in parallel
  const [
    classroom,
    discussionsCreated,
    placementApplications,
    recentApplications,
  ] = await Promise.all([
    user.classroom
      ? Classroom.findById(user.classroom)
          .select("branch batch section")
          .lean()
      : null,

    Discussion.countDocuments({ author: userId }),

    Application.countDocuments({ student: userId }),

    Application.find({ student: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("drive", "companyName role status deadline")
      .lean(),
  ]);

  return {
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      rollNumber: user.rollNumber,
      branch: user.branch,
      year: user.year,
      section: user.section,
      batch: user.batch,
      cgpa: user.cgpa,
      backlogs: user.backlogs,
      role: user.role,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
    },

    stats: {
      clubsFollowing: user.followedClubs.length,
      eventsRegistered: user.registeredEvents.length,
      discussionsCreated,
      placementApplications,
    },

    classroom,

    followedClubs: user.followedClubs,

    registeredEvents: user.registeredEvents,

    recentApplications,
  };
};

export { ACCESS_COOKIE_OPTIONS, REFRESH_COOKIE_OPTIONS };