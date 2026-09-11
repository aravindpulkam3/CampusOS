import api from "./axios.js";

// Single call — the backend aggregates and normalizes everything for the logged-in
// user, so the dashboard never assembles sections from raw domain objects.
// GET /api/dashboard
// Returns: {
//   generatedAt,
//   profile:        { classroomId, classroomLabel, currentSemesterNumber,
//                     canEvaluateEligibility, placementProfileComplete, missingFields },
//   actionRequired: [{ id, kind, severity, title, subtitle, dueAt, url, actionLabel }],
//   schedule:       [{ id, type, title, subtitle, startAt, endAt, location, isOngoing, url }],
//   notices:        [{ id, title, message, sourceType, sourceName, priority, createdAt, url }],
//   deadlines:      [{ id, title, type, subject, dueDate, url }],
//   eligibleDrives: [{ id, companyName, role, registrationDeadline, url, ... }],
//   discussions:    [{ id, title, category, commentCount, upvoteCount, url }],
// }
export const getDashboard = () => api.get("/dashboard");
export const globalSearchApi = (q, signal) =>
  api.get("/dashboard/search", { params: { q }, signal });