import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { uploadCSV } from "../middleware/csvUploadMiddleware.js";
import {
  importRoster,
  listRoster,
  updateAcademics,
  updateYear,
} from "../controllers/roster.controller.js";

// Mounted at /api/admin/roster.
const rosterRouter = express.Router();
const isSuperAdmin = roleMiddleware("superadmin");

rosterRouter.use(authMiddleware);

rosterRouter.post(
  "/import",
  isSuperAdmin,
  uploadCSV.single("file"),
  importRoster,
);
rosterRouter.get("/", isSuperAdmin, listRoster);
// Placement-owned academic data: coordinators may correct CGPA/backlogs.
rosterRouter.patch(
  "/students/:rollNumber/academics",
  roleMiddleware("superadmin", "placementCoordinator"),
  updateAcademics,
);
// Cohort identity: superadmin only.
rosterRouter.patch("/students/:rollNumber/year", isSuperAdmin, updateYear);

export default rosterRouter;
