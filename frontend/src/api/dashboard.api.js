import api from "./axios.js";

// Single call — the backend aggregates and normalizes everything for the logged-in
// user, so the dashboard never assembles sections from raw domain objects.
// GET /api/dashboard
// Returns: {
//   generatedAt,
//   profile:        { classroomId, classroomLabel, currentSemesterNumber,
//                     canEvaluateEligibility, placementProfileComplete, missingFields },
//   schedule:       [{ id, type, title, subtitle, location, startAt, endAt, isOngoing, hasTime, url }],
//   notices:        [{ id, title, message, sourceType, sourceName, priority, isPinned, createdAt, url }],
//   dontMiss:       [{ id, type, title, subtitle, closesAt, urgency, actionLabel, url }],
//   deadlines:      [{ id, title, type, subject, dueDate, url }],
//   eligibleDrives: [{ id, companyName, role, registrationDeadline, url, ... }],
// }
export const getDashboard = () => api.get("/dashboard");
export const globalSearchApi = (q, signal) =>
  api.get("/dashboard/search", { params: { q }, signal });