//https://claude.ai/share/08aaa4ce-0935-4702-a5f2-e95e00ef8a64 authentication chat link

import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  getProfileData
} from "../services/auth.service.js";

export const signup = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);

  sendResponse(res, 201, "Account created successfully.", {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    branch: user.branch,
    year: user.year,
    section: user.section,
    rollNumber: user.rollNumber,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required." });
  }

  const { user, accessToken, refreshToken } = await loginUser(email, password);

  res
    .cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS)
    .cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

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
    registeredEvents: user.registeredEvents,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;
  const { newAccessToken, newRefreshToken } =
    await refreshAccessToken(incomingRefreshToken);

  res
    .cookie("accessToken", newAccessToken, ACCESS_COOKIE_OPTIONS)
    .cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

  sendResponse(res, 200, "Token refreshed.");
});

export const logout = asyncHandler(async (req, res) => {
  await logoutUser(req.user._id);

  res.clearCookie("accessToken").clearCookie("refreshToken");

  sendResponse(res, 200, "Logged out successfully.");
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

// export const getProfile=asyncHandler(async(req,res)=>{

// })
