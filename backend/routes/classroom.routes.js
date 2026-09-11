import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import classroomAuthMiddleware from "../middleware/classroomAuthMiddleware.js";
import {
  getClassroom,
  getDeadlines,
  startNextSemester,
  addPeriod,
  updatePeriod,
  deletePeriod,
  createDeadline,
  updateDeadline,
  deleteDeadline,
  createClassroomAdmin,
  listClassroomsAdmin,
  updateClassroomAdmin,
  overrideSemesterAdmin,
} from "../controllers/classroom.controller.js";

const classRoomRouter = express.Router();

// Self-service, read-only — no writes ever happen in these handlers.
classRoomRouter.get("/", authMiddleware, getClassroom);
classRoomRouter.get("/deadlines", authMiddleware, getDeadlines);

// Semester lifecycle — one destructive, one-shot action. No request body is
// read here, so the client can never choose the next semester number.
classRoomRouter.post(
  "/:classroomId/semester/next",
  authMiddleware,
  classroomAuthMiddleware,
  startNextSemester,
);

// Timetable — the classroom's one current timetable.
classRoomRouter.post("/:classroomId/periods", authMiddleware, classroomAuthMiddleware, addPeriod);
classRoomRouter.patch(
  "/:classroomId/periods/:periodId",
  authMiddleware,
  classroomAuthMiddleware,
  updatePeriod,
);
classRoomRouter.delete(
  "/:classroomId/periods/:periodId",
  authMiddleware,
  classroomAuthMiddleware,
  deletePeriod,
);

// Deadlines — created against the current semester; update/delete are
// blocked once the classroom advances past a deadline's semester.
classRoomRouter.post(
  "/:classroomId/deadlines",
  authMiddleware,
  classroomAuthMiddleware,
  createDeadline,
);
classRoomRouter.put(
  "/:classroomId/deadlines/:deadlineId",
  authMiddleware,
  classroomAuthMiddleware,
  updateDeadline,
);
classRoomRouter.delete(
  "/:classroomId/deadlines/:deadlineId",
  authMiddleware,
  classroomAuthMiddleware,
  deleteDeadline,
);

// ─── admin classroom lifecycle — genuinely global authority, plain role check ──
export const adminClassroomRouter = express.Router();

adminClassroomRouter.use(authMiddleware, roleMiddleware("superadmin"));

adminClassroomRouter.post("/", createClassroomAdmin);
adminClassroomRouter.get("/", listClassroomsAdmin);
adminClassroomRouter.patch("/:classroomId", updateClassroomAdmin);
adminClassroomRouter.patch("/:classroomId/semester-override", overrideSemesterAdmin);

export default classRoomRouter;
