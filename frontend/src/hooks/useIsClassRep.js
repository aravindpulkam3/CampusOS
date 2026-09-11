import { useEffect, useState } from "react";
import { getClassroom } from "../api/classroom.api";
import useAuth from "./useAuth";

// Single shared source of truth for "am I a CR" across the whole frontend —
// resolved from Classroom.classRepresentative via GET /api/classroom, never
// from User.role (a class representative is a relationship, not a role).
const useIsClassRep = () => {
  const { user } = useAuth();
  const [isClassRep, setIsClassRep] = useState(false);
  const [classroomId, setClassroomId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsClassRep(false);
      setClassroomId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const check = async () => {
      try {
        const { data } = await getClassroom();
        if (cancelled) return;
        setIsClassRep(!!data.data.isClassRep);
        setClassroomId(data.data.classroom?._id || null);
      } catch {
        if (!cancelled) {
          setIsClassRep(false);
          setClassroomId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    check();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isClassRep, classroomId, loading };
};

export default useIsClassRep;
