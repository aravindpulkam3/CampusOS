import api from "./axios"

// ─── Dashboard ────────────────────────────────────────────────
// GET /api/drives/dashboard
// Returns: { eligibleDrives, myApplications, myActivities, recentNotices, stats }
export const getCareerDashboard = () => api.get("/drives/dashboard")

// ─── Drives ───────────────────────────────────────────────────
export const getAllDrives = (params) => api.get("/drives", { params })

// GET /api/drives/:id
export const getDriveById = (id) => api.get(`/drives/${id}`)

// POST /api/drives (coordinator/superadmin only)
export const createDrive = (data) => api.post("/drives", data)

// PATCH /api/drives/:id (coordinator/superadmin only, allow-listed fields)
export const updateDrive = (id, data) => api.patch(`/drives/${id}`, data)

// DELETE /api/drives/:id (coordinator/superadmin only)
export const deleteDrive = (id) => api.delete(`/drives/${id}`)

// ─── Applications ─────────────────────────────────────────────
// GET /api/applications/my → logged-in student's applications
export const getMyApplications = () => api.get("/applications/my")

// GET /api/drives/:driveId/applications → all applications for a drive (coordinator)
export const getDriveApplications = (driveId, params) =>
  api.get(`/drives/${driveId}/applications`, { params })

// POST /api/applications/drive/:driveId → register for a drive
export const registerForDrive = (driveId) => api.post(`/applications/drive/${driveId}`)

// ─── Rounds (coordinator only) ─────────────────────────────────
// POST /api/drives/:driveId/rounds — append a pending round
export const addRound = (driveId, data) => api.post(`/drives/${driveId}/rounds`, data)

// PATCH /api/drives/:driveId/rounds/:roundId — rename/reschedule
export const updateRound = (driveId, roundId, data) =>
  api.patch(`/drives/${driveId}/rounds/${roundId}`, data)

// DELETE /api/drives/:driveId/rounds/:roundId — pending rounds only
export const deleteRound = (driveId, roundId) =>
  api.delete(`/drives/${driveId}/rounds/${roundId}`)

// POST /api/drives/:driveId/rounds/:roundId/end — mark the physical round over
export const endRound = (driveId, roundId) =>
  api.post(`/drives/${driveId}/rounds/${roundId}/end`)

// POST /api/drives/:driveId/rounds/:roundId/advance — the only action that
// moves currentRoundId (first round, or immediately-next round)
export const advanceRound = (driveId, roundId) =>
  api.post(`/drives/${driveId}/rounds/${roundId}/advance`)

// ─── Shortlist (coordinator only) ──────────────────────────────
// POST /api/drives/:driveId/rounds/:roundId/shortlist/preview — multipart CSV,
// pure validation, never mutates anything
export const previewShortlist = (driveId, roundId, file) => {
  const formData = new FormData()
  formData.append("file", file)
  return api.post(`/drives/${driveId}/rounds/${roundId}/shortlist/preview`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
}

// POST /api/drives/:driveId/rounds/:roundId/shortlist/confirm — body { rollNumbers }
export const confirmShortlist = (driveId, roundId, rollNumbers) =>
  api.post(`/drives/${driveId}/rounds/${roundId}/shortlist/confirm`, { rollNumbers })

// ─── Drive lifecycle (coordinator only) ────────────────────────
// POST /api/drives/:driveId/finish — only once the last round is processed
export const finishDrive = (driveId) => api.post(`/drives/${driveId}/finish`)

// POST /api/drives/:driveId/cancel — terminal, no cascade to applications
export const cancelDrive = (driveId) => api.post(`/drives/${driveId}/cancel`)
