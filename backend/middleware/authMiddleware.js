import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/generateToken.js";

const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized. No token provided." });
  }

  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized. User not found." });
  }

  req.user = user;
  next();
});

export default authMiddleware;