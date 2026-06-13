import api from "./axios.js";

// Single call — backend aggregates everything for the logged-in user
// GET /api/dashboard
// Returns: { classroom, deadlines, notices, events, drives, discussions, stats }
export const getDashboard = () => api.get("/dashboard");