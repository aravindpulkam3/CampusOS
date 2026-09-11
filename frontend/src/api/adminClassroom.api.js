import api from "./axios";

// Superadmin-only — explicit classroom (cohort) lifecycle management. This is
// the only place a Classroom document is ever created.
export const createClassroomAdmin = (data) => api.post("/admin/classroom", data);
export const listClassroomsAdmin = (params = {}) =>
  api.get("/admin/classroom", { params });
export const updateClassroomAdmin = (classroomId, data) =>
  api.patch(`/admin/classroom/${classroomId}`, data);
export const overrideSemesterAdmin = (classroomId, data) =>
  api.patch(`/admin/classroom/${classroomId}/semester-override`, data);
