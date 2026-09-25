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
// Longer queries are answered empty before any cache or DB work: each unique
// query costs four unindexed regex scans and its own Redis key.
const MAX_SEARCH_LENGTH = 100;

export const globalSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (typeof q !== "string" || q.trim().length < 2 || q.length > MAX_SEARCH_LENGTH)
    return sendResponse(res, 200, "Search results", []);
  const results = await searchAll(q);
  return sendResponse(res, 200, "Search results", results);
});
