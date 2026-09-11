import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js';
import {
  applyToDrive,
  getMyApplications,
  getApplicationById,
  updateApplicationNotes,
} from "../controllers/application.controller.js";

const applicationRouter = express.Router();

applicationRouter.post("/drive/:driveId", authMiddleware, applyToDrive);

applicationRouter.get("/my", authMiddleware, getMyApplications);
applicationRouter.get("/:id", authMiddleware, getApplicationById);

applicationRouter.patch(
  "/:id/notes",
  authMiddleware,
  updateApplicationNotes,
);

export default applicationRouter;
