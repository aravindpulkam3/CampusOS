import Classroom from "../models/Classroom.js";
import asyncHandler from "../utils/asyncHandler.js";

// Expects classroomId in req.params.classroomId or req.body.classroomId.
// Authorization is always resolved through the resource relationship
// (Classroom.classRepresentative), never a global role — a class
// representative is not an application-wide role.
const classroomAuthMiddleware = asyncHandler(async (req, res, next) => {
  const classroomId = req.params.classroomId || req.body.classroomId;

  if (!classroomId) {
    return res.status(400).json({ success: false, message: "Classroom ID is required." });
  }

  const classroom = await Classroom.findById(classroomId);

  if (!classroom) {
    return res.status(404).json({ success: false, message: "Classroom not found." });
  }

  const isClassRep =
    classroom.classRepresentative &&
    classroom.classRepresentative.toString() === req.user._id.toString();

  if (!isClassRep && req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. You are not this classroom's representative.",
    });
  }

  req.classroom = classroom; // attach so the controller doesn't re-fetch
  next();
});

export default classroomAuthMiddleware;
