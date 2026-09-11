import Classroom from "../models/Classroom.js";

// Read-only lookup — never creates a Classroom. Cohort records are explicit,
// admin-created data; a missing match means the caller is legitimately
// unassigned, not something this function should silently repair.
export const findClassroomForUser = ({ branch, batch, section }) =>
  Classroom.findOne({ branch, batch, section });
