import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getDashboard } from "../controllers/dashboard.controller.js";

const dashboardRouter = express.Router();

// GET /api/dashboard — single authenticated call, returns full dashboard payload
dashboardRouter.get("/", authMiddleware, getDashboard);

export default dashboardRouter;