import Classroom from "../models/Classroom.js";
import "../models/Curriculum.js";
import { getJSON, setJSON, del } from "../utils/cache.js";

const ACADEMIC_CLASSROOM_TTL = 60 * 60;
const academicCacheKey = (classroomId) =>
  `cache:classroom:${classroomId}:academic`;

// Shared classroom data only. Callers derive permissions and time-dependent
// deadlines/schedules from the current user and clock after this read.
export const getAcademicClassroom = async (classroomId) => {
  const key = academicCacheKey(classroomId);
  const cached = await getJSON(key);
  if (cached) return cached;

  const classroom =
    await Classroom.findById(classroomId).populate("curriculum");
  if (!classroom) return null;

  const shared = classroom.toJSON();
  await setJSON(key, shared, ACADEMIC_CLASSROOM_TTL);
  return shared;
};

export const invalidateAcademicClassroom = (classroomId) =>
  del(academicCacheKey(classroomId));

// A curriculum can serve several classrooms. Subject edits are rare admin
// writes, so a direct lookup keeps invalidation simple and exact.
export const invalidateAcademicClassroomsForCurriculum = async (
  curriculumId,
) => {
  try {
    const classroomIds = await Classroom.find({
      curriculum: curriculumId,
    }).distinct("_id");
    await Promise.all(classroomIds.map(invalidateAcademicClassroom));
  } catch (err) {
    // A failed cache invalidation must not turn an already-saved edit into 500.
    console.error(
      `[CACHE] Classroom curriculum invalidation failed: ${err.message}`,
    );
  }
};

// Read-only lookup — never creates a Classroom. Cohort records are explicit,
// admin-created data; a missing match means the caller is legitimately
// unassigned, not something this function should silently repair.
// `session` lets a caller run the lookup inside its transaction.
export const findClassroomForUser = (
  { branch, batch, section },
  session = null,
) => Classroom.findOne({ branch, batch, section }).session(session);
