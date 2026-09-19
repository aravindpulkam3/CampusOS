import express from "express";
import { signup, login, refresh, logout, getMe,getProfile, updateProfile } from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { loginLimiter, signupLimiter, refreshLimiter } from "../middleware/rateLimitMiddleware.js";

const authRouter = express.Router();

authRouter.post("/signup", signupLimiter, signup);
authRouter.post("/login", loginLimiter, login);
authRouter.post("/refresh", refreshLimiter, refresh);
authRouter.post("/logout", authMiddleware, logout);
authRouter.get("/me", authMiddleware, getMe);
authRouter.get("/profile",authMiddleware,getProfile);
authRouter.patch("/profile",authMiddleware,updateProfile);

export default authRouter;