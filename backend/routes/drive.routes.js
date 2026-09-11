import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { uploadCSV } from "../middleware/csvUploadMiddleware.js";

import {
  getDrives,
  getDriveById,
  createDrive,
  updateDrive,
  deleteDrive,
  getCareerDashboard,
  getDriveApplications,
  addRound,
  updateRound,
  deleteRound,
  endRound,
  advanceRound,
  previewShortlist,
  confirmShortlist,
  finishDrive,
  cancelDrive,
} from "../controllers/drive.controller.js";

const driveRouter = express.Router();

const isCoordinator = roleMiddleware("placementCoordinator", "superadmin");

// ── Dashboard ────────────────────────────────────────────────
driveRouter.get("/dashboard", authMiddleware, getCareerDashboard);

// ── Drives ───────────────────────────────────────────────────
driveRouter.get("/", authMiddleware, getDrives);
driveRouter.get("/:id", authMiddleware, getDriveById);

driveRouter.post("/", authMiddleware, isCoordinator, createDrive);
driveRouter.patch("/:id", authMiddleware, isCoordinator, updateDrive);
driveRouter.delete("/:id", authMiddleware, isCoordinator, deleteDrive);

// ── Applicants (coordinator view) ───────────────────────────
driveRouter.get(
  "/:id/applications",
  authMiddleware,
  isCoordinator,
  getDriveApplications,
);

// ── Rounds ───────────────────────────────────────────────────
driveRouter.post("/:id/rounds", authMiddleware, isCoordinator, addRound);
driveRouter.patch(
  "/:id/rounds/:roundId",
  authMiddleware,
  isCoordinator,
  updateRound,
);
driveRouter.delete(
  "/:id/rounds/:roundId",
  authMiddleware,
  isCoordinator,
  deleteRound,
);
driveRouter.post(
  "/:id/rounds/:roundId/end",
  authMiddleware,
  isCoordinator,
  endRound,
);
driveRouter.post(
  "/:id/rounds/:roundId/advance",
  authMiddleware,
  isCoordinator,
  advanceRound,
);

// ── Shortlist ────────────────────────────────────────────────
driveRouter.post(
  "/:id/rounds/:roundId/shortlist/preview",
  authMiddleware,
  isCoordinator,
  uploadCSV.single("file"),
  previewShortlist,
);
driveRouter.post(
  "/:id/rounds/:roundId/shortlist/confirm",
  authMiddleware,
  isCoordinator,
  confirmShortlist,
);

// ── Drive lifecycle ──────────────────────────────────────────
driveRouter.post("/:id/finish", authMiddleware, isCoordinator, finishDrive);
driveRouter.post("/:id/cancel", authMiddleware, isCoordinator, cancelDrive);

export default driveRouter;
