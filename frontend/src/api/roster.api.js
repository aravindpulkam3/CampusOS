import api from "./axios";

// Student roster — the authoritative list signups are matched against.
// Import and year changes are superadmin-only; CGPA/backlogs may also be
// corrected by placement coordinators.
export const importRosterApi = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/admin/roster/import", formData);
};
export const listRosterApi = (params = {}) => api.get("/admin/roster", { params });
export const updateAcademicsApi = (rollNumber, data) =>
  api.patch(`/admin/roster/students/${encodeURIComponent(rollNumber)}/academics`, data);
export const updateYearApi = (rollNumber, data) =>
  api.patch(`/admin/roster/students/${encodeURIComponent(rollNumber)}/year`, data);
