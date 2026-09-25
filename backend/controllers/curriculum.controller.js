import Curriculum from "../models/Curriculum.js";
import Classroom from "../models/Classroom.js";
import Deadline from "../models/Deadline.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import { invalidateAcademicClassroomsForCurriculum } from "../services/classroom.service.js";

// All routes here are superadmin-only (roleMiddleware) — curriculum is
// centrally-managed academic data, never owned by any one classroom's CR.

export const listCurricula = asyncHandler(async (req, res) => {
  const { branch, semesterNumber } = req.query;
  const query = {};
  if (branch) query.branch = branch;
  if (semesterNumber) query.semesterNumber = Number(semesterNumber);

  const curricula = await Curriculum.find(query).sort({
    branch: 1,
    semesterNumber: 1,
  });

  sendResponse(res, 200, "Curricula fetched.", curricula);
});

export const createCurriculum = asyncHandler(async (req, res) => {
  const { branch, semesterNumber, subjects } = req.body;

  if (!branch || !semesterNumber) {
    return res.status(400).json({
      success: false,
      message: "branch and semesterNumber are required.",
    });
  }

  const existing = await Curriculum.findOne({ branch, semesterNumber });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "A curriculum already exists for this branch/semester.",
    });
  }

  const curriculum = await Curriculum.create({
    branch,
    semesterNumber,
    subjects: subjects || [],
    createdBy: req.user._id,
  });

  sendResponse(res, 201, "Curriculum created.", curriculum);
});

// Always safe — a brand-new subdocument _id, nothing can reference it yet.
export const addSubject = asyncHandler(async (req, res) => {
  const curriculum = await Curriculum.findById(req.params.id);
  if (!curriculum) {
    return res
      .status(404)
      .json({ success: false, message: "Curriculum not found." });
  }

  const { name, code } = req.body;
  if (!name?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Subject name is required." });
  }

  curriculum.subjects.push({ name: name.trim(), code });
  await curriculum.save();
  await invalidateAcademicClassroomsForCurriculum(curriculum._id);

  sendResponse(
    res,
    201,
    "Subject added.",
    curriculum.subjects[curriculum.subjects.length - 1],
  );
});

// Edits name/code IN PLACE — the subdocument _id never changes, so this can
// never break an existing period/deadline reference into it.
export const updateSubject = asyncHandler(async (req, res) => {
  const curriculum = await Curriculum.findById(req.params.id);
  if (!curriculum) {
    return res
      .status(404)
      .json({ success: false, message: "Curriculum not found." });
  }

  const subject = curriculum.subjects.id(req.params.subjectId);
  if (!subject) {
    return res
      .status(404)
      .json({ success: false, message: "Subject not found." });
  }

  const { name, code } = req.body;
  if (name !== undefined) subject.name = name.trim();
  if (code !== undefined) subject.code = code;

  await curriculum.save();
  await invalidateAcademicClassroomsForCurriculum(curriculum._id);
  sendResponse(res, 200, "Subject updated.", subject);
});

// Only allowed if completely unreferenced — never orphans an existing
// period or deadline.
export const deleteSubject = asyncHandler(async (req, res) => {
  const curriculum = await Curriculum.findById(req.params.id);
  if (!curriculum) {
    return res
      .status(404)
      .json({ success: false, message: "Curriculum not found." });
  }

  const subject = curriculum.subjects.id(req.params.subjectId);
  if (!subject) {
    return res
      .status(404)
      .json({ success: false, message: "Subject not found." });
  }

  // Checks ALL deadlines referencing this subject, not just current-semester
  // ones — an old, no-longer-editable deadline still has this subject id
  // stored, and deleting the subject out from under it would leave a
  // dangling reference.
  const [periodCount, deadlineCount] = await Promise.all([
    Classroom.countDocuments({
      curriculum: curriculum._id,
      "periods.subject": subject._id,
    }),
    Deadline.countDocuments({ subject: subject._id }),
  ]);

  if (periodCount > 0 || deadlineCount > 0) {
    return res.status(409).json({
      success: false,
      message:
        "This subject is still referenced by existing periods or deadlines.",
      periodCount,
      deadlineCount,
    });
  }

  subject.deleteOne();
  await curriculum.save();
  await invalidateAcademicClassroomsForCurriculum(curriculum._id);
  sendResponse(res, 200, "Subject deleted.");
});

export const deleteCurriculum = asyncHandler(async (req, res) => {
  const curriculum = await Curriculum.findById(req.params.id);
  if (!curriculum) {
    return res
      .status(404)
      .json({ success: false, message: "Curriculum not found." });
  }

  const referencedCount = await Classroom.countDocuments({
    curriculum: curriculum._id,
  });
  if (referencedCount > 0) {
    return res.status(409).json({
      success: false,
      message: "This curriculum is referenced by existing classrooms.",
      referencedCount,
    });
  }

  await curriculum.deleteOne();
  sendResponse(res, 200, "Curriculum deleted.");
});
