import express from "express";
import { signup, login, refresh, logout, getMe,getProfile } from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const authRouter = express.Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", authMiddleware, logout);
authRouter.get("/me", authMiddleware, getMe);
authRouter.get("/profile",authMiddleware,getProfile);

export default authRouter;