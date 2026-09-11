import { Navigate } from "react-router-dom"

// Per-drive coordinator work (rounds, applicants, settings) lives inside
// DriveDetail's tabs now — this redirects to the drive list rather than
// duplicating it as a separate management page.
const ManageDrives = () => <Navigate to="/career/drives" replace />

export default ManageDrives
