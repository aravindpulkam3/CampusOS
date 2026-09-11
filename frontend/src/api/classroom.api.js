import api from "./axios";

// ─── self-service, read-only ────────────────────────────────────────────────
export const getClassroom = () => api.get("/classroom");
export const getDeadlines = () => api.get("/classroom/deadlines");

// ─── semester lifecycle ──────────────────────────────────────────────────────
// One destructive, one-shot action — no separate "activate" step, and no
// semesterNumber to pass; the server always derives it.
export const startNextSemester = (classroomId) =>
  api.post(`/classroom/${classroomId}/semester/next`);

// ─── timetable — the classroom's one current timetable ─────────────────────
export const addPeriod = (classroomId, data) => api.post(`/classroom/${classroomId}/periods`, data);
export const updatePeriod = (classroomId, periodId, data) =>
  api.patch(`/classroom/${classroomId}/periods/${periodId}`, data);
export const deletePeriod = (classroomId, periodId) =>
  api.delete(`/classroom/${classroomId}/periods/${periodId}`);

// ─── deadlines — always against the current semester; old-semester
// deadlines become read-only through these routes once the classroom
// advances (server enforces this, not just the UI) ──────────────────────────
export const createDeadline = (classroomId, data) =>
  api.post(`/classroom/${classroomId}/deadlines`, data);
export const updateDeadline = (classroomId, deadlineId, data) =>
  api.put(`/classroom/${classroomId}/deadlines/${deadlineId}`, data);
export const deleteDeadline = (classroomId, deadlineId) =>
  api.delete(`/classroom/${classroomId}/deadlines/${deadlineId}`);
