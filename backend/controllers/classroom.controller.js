import mongoose from "mongoose";
import Classroom from "../models/Classroom.js";
import Curriculum from "../models/Curriculum.js";
import Deadline from "../models/Deadline.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import { notifyClassroomStudents } from "../services/notification.service.js";

const MAX_SEMESTERS = 8;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const unassignedResponse = (res) =>
  sendResponse(res, 200, "Classroom fetched successfully", {
    classroom: null,
    reason: "unassigned",
    isClassRep: false,
  });

// ─── self-service, read-only ──────────────────────────────────────────────
// Classroom holds ONLY its current semester's data — currentSemesterNumber,
// curriculum, and periods live directly on it, no separate per-semester
// collection. There is no history: starting a new semester overwrites all
// three in place.

export const getClassroom = asyncHandler(async (req, res) => {
  if (!req.user.classroom) {
    return unassignedResponse(res);
  }

  const classroom = await Classroom.findById(req.user.classroom)
    .populate("classRepresentative", "firstName lastName")
    .populate("curriculum");

  if (!classroom) {
    return unassignedResponse(res);
  }

  const isClassRep =
    req.user.role === "superadmin" ||
    (classroom.classRepresentative &&
      classroom.classRepresentative._id.toString() === req.user._id.toString());

  const upcomingDeadlines = classroom.currentSemesterNumber
    ? await Deadline.find({
        classroom: classroom._id,
        semesterNumber: classroom.currentSemesterNumber,
        dueDate: { $gte: new Date() },
      }).sort({ dueDate: 1 })
    : [];

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayPeriods = DAYS.includes(todayName)
    ? classroom.periods.filter((p) => p.day === todayName)
    : [];

  return sendResponse(res, 200, "Classroom fetched successfully", {
    classroom,
    isClassRep,
    todayPeriods,
    upcomingDeadlines,
  });
});

export const getDeadlines = asyncHandler(async (req, res) => {
  if (!req.user.classroom) {
    return sendResponse(res, 200, "deadlines fetched", []);
  }

  const classroom = await Classroom.findById(req.user.classroom).select(
    "currentSemesterNumber",
  );
  if (!classroom || !classroom.currentSemesterNumber) {
    return sendResponse(res, 200, "deadlines fetched", []);
  }

  const deadlines = await Deadline.find({
    classroom: classroom._id,
    semesterNumber: classroom.currentSemesterNumber,
  }).sort({ dueDate: 1 });

  sendResponse(res, 200, "deadlines fetched", deadlines);
});

// ─── semester lifecycle (CR / superadmin, classroomAuthMiddleware) ────────
// Deliberately destructive: overwrites currentSemesterNumber/curriculum/
// periods in place. The previous semester's timetable is NOT archived
// anywhere and cannot be recovered once this runs — that's an accepted,
// intentional tradeoff for this scope, not a gap. Deadline/Notice keep
// current-semester correctness via their own semesterNumber snapshot
// instead of a reference to a semester record.

// Shared by the normal flow (derived number) and the admin override
// (explicit number) — the actual field mutation is identical either way.
const applySemesterTransition = async (classroom, semesterNumber, curriculum) => {
  classroom.currentSemesterNumber = semesterNumber;
  classroom.curriculum = curriculum._id;
  classroom.periods = [];
  await classroom.save();
  await classroom.populate("curriculum");
  return classroom;
};

export const startNextSemester = asyncHandler(async (req, res) => {
  const classroom = req.classroom;

  // The next semester number is ALWAYS derived — the client can never
  // choose it here. Only the superadmin override route (overrideSemesterAdmin)
  // accepts an explicit number.
  const nextNumber = classroom.currentSemesterNumber
    ? classroom.currentSemesterNumber + 1
    : 1;

  if (nextNumber > MAX_SEMESTERS) {
    return res.status(409).json({
      success: false,
      message: "This classroom has completed the program.",
    });
  }

  const curriculum = await Curriculum.findOne({
    branch: classroom.branch,
    semesterNumber: nextNumber,
  });

  if (!curriculum) {
    return res.status(409).json({
      success: false,
      message: `No curriculum defined for ${classroom.branch} semester ${nextNumber} yet — contact an admin.`,
    });
  }

  await applySemesterTransition(classroom, nextNumber, curriculum);

  sendResponse(
    res,
    200,
    "Semester advanced. The previous timetable has been permanently cleared.",
    classroom,
  );
});

// ─── timetable periods (CR / superadmin, classroomAuthMiddleware) ─────────
// Always the classroom's one current timetable — there's nothing else to
// scope to.

const validatePeriodInput = ({ day, subject, startTime, endTime }) => {
  if (!DAYS.includes(day)) return "Invalid day.";
  if (!subject || !mongoose.Types.ObjectId.isValid(subject)) return "Invalid subject.";
  if (typeof startTime !== "number" || typeof endTime !== "number") {
    return "startTime/endTime must be numbers (minutes since midnight).";
  }
  if (startTime < 0 || startTime > 1439 || endTime < 0 || endTime > 1439) {
    return "startTime/endTime must be within 0-1439.";
  }
  if (startTime >= endTime) return "startTime must be before endTime.";
  return null;
};

const findOverlap = (periods, { day, startTime, endTime }, excludePeriodId) =>
  periods.find((p) => {
    if (excludePeriodId && p._id.toString() === excludePeriodId.toString()) return false;
    if (p.day !== day) return false;
    return startTime < p.endTime && p.startTime < endTime;
  });

export const addPeriod = asyncHandler(async (req, res) => {
  const classroom = req.classroom;

  if (!classroom.curriculum) {
    return res.status(409).json({
      success: false,
      message: "This classroom has no current semester yet.",
    });
  }

  const { day, subject, faculty, room, startTime, endTime } = req.body;
  const validationError = validatePeriodInput({ day, subject, startTime, endTime });
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  await classroom.populate("curriculum");
  const subjectExists = classroom.curriculum.subjects.some((s) => s._id.toString() === subject);
  if (!subjectExists) {
    return res.status(400).json({
      success: false,
      message: "Subject does not belong to this classroom's current curriculum.",
    });
  }

  const conflict = findOverlap(classroom.periods, { day, startTime, endTime });
  if (conflict) {
    return res.status(409).json({
      success: false,
      message: `Overlaps with an existing period on ${day}.`,
      conflictingPeriodId: conflict._id,
    });
  }

  classroom.periods.push({ day, subject, faculty, room, startTime, endTime });
  await classroom.save();

  sendResponse(res, 201, "Period added.", classroom.periods[classroom.periods.length - 1]);
});

export const updatePeriod = asyncHandler(async (req, res) => {
  const classroom = req.classroom;

  const period = classroom.periods.id(req.params.periodId);
  if (!period) {
    return res.status(404).json({ success: false, message: "Period not found." });
  }

  const day = req.body.day ?? period.day;
  const subject = req.body.subject ?? period.subject.toString();
  const startTime = req.body.startTime ?? period.startTime;
  const endTime = req.body.endTime ?? period.endTime;

  const validationError = validatePeriodInput({ day, subject, startTime, endTime });
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  await classroom.populate("curriculum");
  const subjectExists = classroom.curriculum.subjects.some((s) => s._id.toString() === subject);
  if (!subjectExists) {
    return res.status(400).json({
      success: false,
      message: "Subject does not belong to this classroom's current curriculum.",
    });
  }

  const conflict = findOverlap(classroom.periods, { day, startTime, endTime }, period._id);
  if (conflict) {
    return res.status(409).json({
      success: false,
      message: `Overlaps with an existing period on ${day}.`,
      conflictingPeriodId: conflict._id,
    });
  }

  period.day = day;
  period.subject = subject;
  period.startTime = startTime;
  period.endTime = endTime;
  if (req.body.faculty !== undefined) period.faculty = req.body.faculty;
  if (req.body.room !== undefined) period.room = req.body.room;

  await classroom.save();
  sendResponse(res, 200, "Period updated.", period);
});

export const deletePeriod = asyncHandler(async (req, res) => {
  const classroom = req.classroom;

  const period = classroom.periods.id(req.params.periodId);
  if (!period) {
    return res.status(404).json({ success: false, message: "Period not found." });
  }

  period.deleteOne();
  await classroom.save();
  sendResponse(res, 200, "Period deleted.");
});

// ─── deadlines (CR / superadmin, classroomAuthMiddleware) ─────────────────
// Created against the classroom's current semester, stamped as a
// semesterNumber snapshot (not a reference — there's no per-semester record
// to point at). Once the classroom advances past a deadline's semester, its
// subject can no longer be safely validated against the classroom's CURRENT
// curriculum (which may have moved on entirely), so update/delete are
// blocked from that point on — an accepted, deliberate limitation, not a
// bug. Old deadlines stay readable for record purposes; they just become
// immutable through these routes.

export const createDeadline = asyncHandler(async (req, res) => {
  const classroom = req.classroom;

  if (!classroom.currentSemesterNumber) {
    return res.status(409).json({
      success: false,
      message: "This classroom has no current semester yet.",
    });
  }

  const { title, description, type, dueDate, subject } = req.body;

  if (subject) {
    await classroom.populate("curriculum");
    const subjectExists = classroom.curriculum.subjects.some((s) => s._id.toString() === subject);
    if (!subjectExists) {
      return res.status(400).json({
        success: false,
        message: "Subject does not belong to the current semester's curriculum.",
      });
    }
  }

  // classroom/semesterNumber/postedBy are always server-derived from the
  // authenticated route context — never accepted from the client.
  const deadline = await Deadline.create({
    title,
    description,
    type,
    dueDate,
    subject: subject || null,
    classroom: classroom._id,
    semesterNumber: classroom.currentSemesterNumber,
    postedBy: req.user._id,
  });

  notifyClassroomStudents(classroom._id, req.user._id, {
    type: "classroom_deadline",
    title: "New deadline posted",
    message: title,
    targetType: "deadline",
    targetId: deadline._id,
    createdBy: req.user._id,
  });

  sendResponse(res, 201, "Deadline created.", deadline);
});

export const updateDeadline = asyncHandler(async (req, res) => {
  const classroom = req.classroom;

  const deadline = await Deadline.findOne({
    _id: req.params.deadlineId,
    classroom: classroom._id,
  });
  if (!deadline) {
    return res.status(404).json({ success: false, message: "Deadline not found." });
  }

  if (deadline.semesterNumber !== classroom.currentSemesterNumber) {
    return res.status(409).json({
      success: false,
      message: "This deadline belongs to a previous semester and can no longer be edited.",
    });
  }

  const { title, description, type, dueDate, subject } = req.body;

  if (subject) {
    await classroom.populate("curriculum");
    const subjectExists = classroom.curriculum.subjects.some((s) => s._id.toString() === subject);
    if (!subjectExists) {
      return res.status(400).json({
        success: false,
        message: "Subject does not belong to this classroom's current curriculum.",
      });
    }
  }

  if (title !== undefined) deadline.title = title;
  if (description !== undefined) deadline.description = description;
  if (type !== undefined) deadline.type = type;
  if (dueDate !== undefined) deadline.dueDate = dueDate;
  if (subject !== undefined) deadline.subject = subject || null;

  await deadline.save();
  sendResponse(res, 200, "Deadline updated.", deadline);
});

export const deleteDeadline = asyncHandler(async (req, res) => {
  const classroom = req.classroom;

  const deadline = await Deadline.findOne({
    _id: req.params.deadlineId,
    classroom: classroom._id,
  });
  if (!deadline) {
    return res.status(404).json({ success: false, message: "Deadline not found." });
  }

  if (deadline.semesterNumber !== classroom.currentSemesterNumber) {
    return res.status(409).json({
      success: false,
      message: "This deadline belongs to a previous semester and can no longer be deleted.",
    });
  }

  await deadline.deleteOne();
  sendResponse(res, 200, "Deadline deleted.");
});

// ─── admin classroom lifecycle (superadmin, roleMiddleware) ───────────────

export const createClassroomAdmin = asyncHandler(async (req, res) => {
  const { branch, batch, section } = req.body;

  if (!branch || !batch || !section) {
    return res.status(400).json({
      success: false,
      message: "branch, batch, and section are required.",
    });
  }

  const existing = await Classroom.findOne({ branch, batch, section });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "A classroom already exists for this cohort.",
    });
  }

  const classroom = await Classroom.create({ branch, batch, section });

  // Explicit, admin-triggered repair — never a hidden GET-time write. Any
  // student who signed up before this cohort's classroom existed gets
  // linked automatically as a deliberate side effect of this write.
  await User.updateMany(
    { branch, batch, section, classroom: null },
    { classroom: classroom._id },
  );

  sendResponse(res, 201, "Classroom created.", classroom);
});

export const listClassroomsAdmin = asyncHandler(async (req, res) => {
  const { branch, batch, section } = req.query;
  const query = {};
  if (branch) query.branch = branch;
  if (batch) query.batch = Number(batch);
  if (section) query.section = section;

  const classrooms = await Classroom.find(query)
    .populate("classRepresentative", "firstName lastName email")
    .sort({ branch: 1, batch: 1, section: 1 });

  sendResponse(res, 200, "Classrooms fetched.", classrooms);
});

export const updateClassroomAdmin = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.classroomId);
  if (!classroom) {
    return res.status(404).json({ success: false, message: "Classroom not found." });
  }

  const { classRepresentative, classRepresentativeRollNumber, branch, batch, section } = req.body;

  // CR assignment is a relationship, not a role — this never touches
  // User.role, and is unrestricted by who the target user currently is.
  // Accept either a raw id or a roll number lookup (nicer admin UX; no
  // separate user-search endpoint needed for this small a feature).
  if (classRepresentativeRollNumber !== undefined) {
    if (!classRepresentativeRollNumber) {
      classroom.classRepresentative = null;
    } else {
      const repUser = await User.findOne({
        rollNumber: classRepresentativeRollNumber.trim().toUpperCase(),
      }).select("_id");
      if (!repUser) {
        return res.status(404).json({
          success: false,
          message: "No user found with that roll number.",
        });
      }
      classroom.classRepresentative = repUser._id;
    }
  } else if (classRepresentative !== undefined) {
    classroom.classRepresentative = classRepresentative || null;
  }

  if (branch !== undefined || batch !== undefined || section !== undefined) {
    const hasUsers = await User.exists({ classroom: classroom._id });
    const hasSemesterData = classroom.currentSemesterNumber !== null;

    if (hasUsers || hasSemesterData) {
      return res.status(409).json({
        success: false,
        message:
          "This classroom's identity is locked because users or semester data already depend on it.",
      });
    }

    if (branch !== undefined) classroom.branch = branch;
    if (batch !== undefined) classroom.batch = batch;
    if (section !== undefined) classroom.section = section;
  }

  await classroom.save();
  sendResponse(res, 200, "Classroom updated.", classroom);
});

// Explicit, separate escape hatch — never reachable from the ordinary CR
// "start next semester" flow. For onboarding a classroom mid-program or
// correcting a mistake, by jumping straight to an arbitrary valid semester
// number instead of the always-derived next one. Equally destructive to the
// normal flow — see applySemesterTransition.
export const overrideSemesterAdmin = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.classroomId);
  if (!classroom) {
    return res.status(404).json({ success: false, message: "Classroom not found." });
  }

  const { semesterNumber } = req.body;
  if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > MAX_SEMESTERS) {
    return res.status(400).json({
      success: false,
      message: `semesterNumber must be an integer between 1 and ${MAX_SEMESTERS}.`,
    });
  }

  const curriculum = await Curriculum.findOne({
    branch: classroom.branch,
    semesterNumber,
  });

  if (!curriculum) {
    return res.status(404).json({
      success: false,
      message: `No curriculum defined for ${classroom.branch} semester ${semesterNumber}.`,
    });
  }

  await applySemesterTransition(classroom, semesterNumber, curriculum);

  sendResponse(
    res,
    200,
    "Semester overridden. The previous timetable has been permanently cleared.",
    classroom,
  );
});
