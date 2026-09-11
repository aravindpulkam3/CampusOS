import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import {
  searchAll,
  buildStudentDashboard,
} from "../services/dashboard.service.js";

// ─── GET /api/dashboard ───────────────────────────────────────────────────────
// A personalized aggregation endpoint. All the "what is relevant to this
// student?" logic lives in dashboard.service.js; this is transport only.
export const getDashboard = asyncHandler(async (req, res) => {
  const data = await buildStudentDashboard(req.user);
  return sendResponse(res, 200, "Dashboard data fetched.", data);
});

// ─── GET /api/dashboard/search ────────────────────────────────────────────────
export const globalSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2)
    return sendResponse(res, 200, "Search results", []);
  const results = await searchAll(q);
  return sendResponse(res, 200, "Search results", results);
});
