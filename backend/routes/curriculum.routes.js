import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  listCurricula,
  createCurriculum,
  addSubject,
  updateSubject,
  deleteSubject,
  deleteCurriculum,
} from "../controllers/curriculum.controller.js";

const curriculumRouter = express.Router();

curriculumRouter.use(authMiddleware, roleMiddleware("superadmin"));

curriculumRouter.get("/", listCurricula);
curriculumRouter.post("/", createCurriculum);
curriculumRouter.post("/:id/subjects", addSubject);
curriculumRouter.patch("/:id/subjects/:subjectId", updateSubject);
curriculumRouter.delete("/:id/subjects/:subjectId", deleteSubject);
curriculumRouter.delete("/:id", deleteCurriculum);

export default curriculumRouter;
