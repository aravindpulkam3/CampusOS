import api from "./axios";

// Superadmin-only — centrally-managed academic subject definitions.
export const getCurricula = (params = {}) => api.get("/curriculum", { params });
export const createCurriculum = (data) => api.post("/curriculum", data);
export const addSubject = (curriculumId, data) =>
  api.post(`/curriculum/${curriculumId}/subjects`, data);
export const updateSubject = (curriculumId, subjectId, data) =>
  api.patch(`/curriculum/${curriculumId}/subjects/${subjectId}`, data);
export const deleteSubject = (curriculumId, subjectId) =>
  api.delete(`/curriculum/${curriculumId}/subjects/${subjectId}`);
export const deleteCurriculum = (curriculumId) => api.delete(`/curriculum/${curriculumId}`);
