// import api from "./api.js";

// // ── Dashboard ────────────────────────────────────────────────
// export const getCareerDashboard = () => api.get("/career/dashboard");

// // ── Drives ───────────────────────────────────────────────────
// export const getDrives    = (params) => api.get("/career/drives", { params });
// export const getDriveById = (id)     => api.get(`/career/drives/${id}`);
// export const createDrive  = (data)   => api.post("/career/drives", data);
// export const updateDrive  = (id, data) => api.patch(`/career/drives/${id}`, data);
// export const deleteDrive  = (id)     => api.delete(`/career/drives/${id}`);

// // ── Applications ─────────────────────────────────────────────
// export const applyToDrive            = (driveId)        => api.post(`/career/drives/${driveId}/apply`);
// export const getMyApplications       = ()               => api.get("/career/applications/mine");
// export const getApplicationById      = (id)             => api.get(`/career/applications/${id}`);
// export const updateApplicationStatus = (id, data)       => api.patch(`/career/applications/${id}/status`, data);
// export const updateApplicationNotes  = (id, data)       => api.patch(`/career/applications/${id}/notes`, data);
// export const withdrawApplication     = (id)             => api.delete(`/career/applications/${id}/withdraw`);
// export const getDriveApplications    = (driveId, params) => api.get(`/career/drives/${driveId}/applications`, { params });

import api from "./axios"

// ─── Dashboard ────────────────────────────────────────────────
// GET /api/drives/dashboard
// Returns: { upcomingDrives, recentNotices, stats, myActivities }
export const getCareerDashboard = () => api.get("/drives/dashboard")

// ─── Drives ───────────────────────────────────────────────────
export const getAllDrives = (params) => api.get("/drives", { params })

// GET /api/drives/:id
export const getDriveById = (id) => api.get(`/drives/${id}`)

// POST /api/drives (superadmin only)
export const createDrive = (data) => api.post("/drives", data)

// PUT /api/drives/:id (superadmin only)
export const updateDrive = (id, data) => api.put(`/drives/${id}`, data)

// DELETE /api/drives/:id (superadmin only)
export const deleteDrive = (id) => api.delete(`/drives/${id}`)

// ─── Applications ─────────────────────────────────────────────
// GET /api/applications/my → logged-in student's applications
export const getMyApplications = () => api.get("/applications/my")

// GET /api/applications/drive/:driveId → all applications for a drive (admin)
export const getDriveApplications = (driveId) => api.get(`/applications/drive/${driveId}`)

// POST /api/applications/drive/:driveId → register for a drive
export const registerForDrive = (driveId) => api.post(`/applications/drive/${driveId}`)

// PATCH /api/applications/:id/status → update status (admin only)
export const updateApplicationStatus = (id, data) => api.patch(`/applications/${id}/status`, data)

// PATCH /api/applications/bulk-update → bulk status update (admin only)
// body: { driveId, fromStatus, toStatus, filters: { minCGPA, branches } }
export const bulkUpdateApplications = (data) => api.patch("/applications/bulk-update", data)

// POST /api/applications/shortlist → shortlist by roll numbers (admin only)
// body: { driveId, rollNumbers: [] }
export const shortlistByRollNumbers = (data) => api.post("/applications/shortlist", data)

// ─── Drive Notices ────────────────────────────────────────────
// GET /api/notices?category=placement&placement=:driveId
export const getDriveNotices = (driveId) => api.get("/notices", {
  params: { category: "placement", placement: driveId }
})