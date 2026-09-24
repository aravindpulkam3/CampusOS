import express from "express";
import {
  signup,
  verifyEmail,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe,
  getProfile,
  updateProfile,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  loginIpLimiter,
  loginEmailLimiter,
  signupLimiter,
  forgotPasswordLimiter,
  refreshLimiter,
} from "../middleware/rateLimitMiddleware.js";

const authRouter = express.Router();

authRouter.post("/signup", signupLimiter, signup);
authRouter.post("/verify-email", signupLimiter, verifyEmail);
authRouter.post("/login", loginIpLimiter, loginEmailLimiter, login);
authRouter.post("/refresh", refreshLimiter, refresh);
// logout identifies the session from the refresh cookie, so it needs no
// (possibly expired) access token.
authRouter.post("/logout", logout);
authRouter.post("/logout-all", authMiddleware, logoutAll);
authRouter.patch("/password", authMiddleware, changePassword);
authRouter.post(
  "/forgot-password",
  signupLimiter,
  forgotPasswordLimiter,
  forgotPassword,
);
authRouter.post("/reset-password", signupLimiter, resetPassword);
authRouter.get("/me", authMiddleware, getMe);
authRouter.get("/profile", authMiddleware, getProfile);
authRouter.patch("/profile", authMiddleware, updateProfile);

export default authRouter;
