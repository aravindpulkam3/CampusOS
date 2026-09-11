import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock,
  Calendar,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  X,
  Sparkles,
  Info,
  AlertTriangle,
} from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import {
  getClassroom,
  deleteDeadline,
  addPeriod,
  updatePeriod,
  deletePeriod,
  startNextSemester,
} from "../../../api/classroom.api";
import NoticeFeed from "../../../components/cards/NoticeFeed";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEADLINE_TYPES = {
  assignment: { label: "Assignment", color: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-400" },
  quiz: { label: "Quiz", color: "bg-purple-50 text-purple-700 border-purple-100", dot: "bg-purple-400" },
  minor_exam: { label: "Minor Exam", color: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-400" },
  lab_exam: { label: "Lab Exam", color: "bg-green-50 text-green-700 border-green-100", dot: "bg-green-400" },
  semester_exam: { label: "Semester Exam", color: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-400" },
  project: { label: "Project", color: "bg-teal-50 text-teal-700 border-teal-100", dot: "bg-teal-400" },
  general: { label: "General", color: "bg-gray-50 text-gray-700 border-gray-100", dot: "bg-gray-400" },
};

// ─── time helpers — storage is minutes-since-midnight, inputs/display are strings ──
const minutesToInputTime = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const timeInputToMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const minutesToLabel = (m) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min).padStart(2, "0")} ${period}`;
};

const formatDueDate = (d) => {
  const date = new Date(d);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString())
    return { label: "Due Today", color: "text-red-600", urgent: true };
  if (date.toDateString() === tomorrow.toDateString())
    return { label: "Due Tomorrow", color: "text-amber-600", urgent: true };
  return {
    label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    color: "text-gray-500",
    urgent: false,
  };
};

const Skeleton = () => (
  <div className="max-w-4xl mx-auto animate-pulse space-y-4">
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="w-32 h-5 bg-gray-100 rounded mb-2" />
      <div className="w-20 h-3 bg-gray-100 rounded" />
    </div>
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="w-40 h-4 bg-gray-100 rounded mb-4" />
        <div className="w-full h-24 bg-gray-100 rounded-xl" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ message }) => (
  <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
    {message}
  </p>
);

// ─── Confirmation modal — used for the destructive "start next semester" action ──
const ConfirmModal = ({ title, message, confirmLabel, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-sm p-5">
      <div className="flex items-start gap-2.5 mb-3">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Working..." : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─── Timetable grid — columns are fixed (Mon-Sat), rows are derived from the
// distinct time ranges actually present in the timetable, never a
// hardcoded slot table ─────────────────────────────────────────────────────
const TimetableGrid = ({ periods, subjects, editable, onAddClick, onEditClick, onDeleteClick }) => {
  const rowMap = new Map();
  periods.forEach((p) => rowMap.set(`${p.startTime}-${p.endTime}`, { startTime: p.startTime, endTime: p.endTime }));
  const rows = [...rowMap.values()].sort((a, b) => a.startTime - b.startTime);

  const subjectMap = new Map(subjects.map((s) => [s._id, s]));
  const cellFor = (day, row) =>
    periods.find((p) => p.day === day && p.startTime === row.startTime && p.endTime === row.endTime);

  if (rows.length === 0 && !editable) {
    return <EmptyState message="No timetable set yet." />;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-gray-400 font-medium whitespace-nowrap">Time</th>
              {DAYS.map((d) => (
                <th key={d} className="p-2 text-gray-500 font-medium">
                  {d.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="p-2 text-gray-400 whitespace-nowrap align-top pt-3">
                  {minutesToLabel(row.startTime)}
                  <br />
                  {minutesToLabel(row.endTime)}
                </td>
                {DAYS.map((day) => {
                  const period = cellFor(day, row);
                  const subject = period && subjectMap.get(period.subject);
                  return (
                    <td key={day} className="p-1.5 align-top">
                      {period ? (
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2 group relative min-w-[90px]">
                          <p className="font-semibold text-gray-900 truncate">
                            {subject?.name || "Unknown subject"}
                          </p>
                          {period.faculty && <p className="text-gray-400 truncate">{period.faculty}</p>}
                          {period.room && <p className="text-gray-400 truncate">{period.room}</p>}
                          {editable && (
                            <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => onEditClick(period)}
                                className="text-gray-400 hover:text-gray-900"
                              >
                                <Pencil size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteClick(period)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : editable ? (
                        <button
                          type="button"
                          onClick={() => onAddClick(day, row)}
                          className="w-full min-h-[52px] border border-dashed border-gray-200 rounded-lg text-gray-300 hover:border-gray-400 hover:text-gray-500 flex items-center justify-center transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && editable && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  No periods yet — add the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editable && (
        <button
          type="button"
          onClick={() => onAddClick(null, null)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <Plus size={12} /> Add a period
        </button>
      )}
    </div>
  );
};

// ─── Add/edit period modal ──────────────────────────────────────────────────
const PeriodFormModal = ({ initial, day, subjects, onSave, onClose, onDelete }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    day: initial?.day || day || "Monday",
    subject: initial?.subject || subjects[0]?._id || "",
    faculty: initial?.faculty || "",
    room: initial?.room || "",
    startTime: initial ? minutesToInputTime(initial.startTime) : "",
    endTime: initial ? minutesToInputTime(initial.endTime) : "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.subject) return setError("Select a subject.");
    if (!form.startTime || !form.endTime) return setError("Start and end time are required.");

    const startTime = timeInputToMinutes(form.startTime);
    const endTime = timeInputToMinutes(form.endTime);
    if (startTime >= endTime) return setError("Start time must be before end time.");

    setSaving(true);
    try {
      await onSave({
        day: form.day,
        subject: form.subject,
        faculty: form.faculty,
        room: form.room,
        startTime,
        endTime,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save period.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete period.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{isEdit ? "Edit period" : "Add period"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Day</label>
            <select
              value={form.day}
              onChange={handleChange("day")}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Subject</label>
            <select
              value={form.subject}
              onChange={handleChange("subject")}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                  {s.code ? ` (${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Start</label>
              <input
                type="time"
                value={form.startTime}
                onChange={handleChange("startTime")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">End</label>
              <input
                type="time"
                value={form.endTime}
                onChange={handleChange("endTime")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Faculty (optional)</label>
            <input
              type="text"
              placeholder="e.g. Dr. Rao"
              value={form.faculty}
              onChange={handleChange("faculty")}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Room (optional)</label>
            <input
              type="text"
              placeholder="e.g. C101"
              value={form.room}
              onChange={handleChange("room")}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete period"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Deadline card ───────────────────────────────────────────────────────────
const DeadlineCard = ({ deadline, classroomId, isClassRep, onDelete }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const due = formatDueDate(deadline.dueDate);
  const cfg = DEADLINE_TYPES[deadline.type] || DEADLINE_TYPES.general;

  const handleDelete = async () => {
    setMenuOpen(false);
    setDeleting(true);
    try {
      await deleteDeadline(classroomId, deadline._id);
      onDelete(deadline._id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`relative flex items-start gap-3.5 p-4 bg-white border rounded-xl transition-all duration-200
      ${due.urgent ? "border-amber-100 bg-amber-50/30" : "border-gray-100"}
      ${deleting ? "opacity-50" : ""}
    `}
    >
      <div className="flex-shrink-0 mt-1">
        <span className={`w-2 h-2 rounded-full block ${cfg.dot}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{deadline.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            {deadline.description && (
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
                {deadline.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <span className={`text-xs font-semibold ${due.color}`}>{due.label}</span>
            </div>

            {isClassRep && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((p) => !p)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <MoreHorizontal size={14} />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-7 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-32">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(`/academics/${classroomId}/deadline/form/${deadline._id}`, {
                            state: { deadline },
                          });
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────
const Classroom = () => {
  const { user } = useAuth();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { period, day }
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchOverview = useCallback(async () => {
    try {
      const { data } = await getClassroom();
      setOverview(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    fetchOverview();
  }, [user?._id, fetchOverview]);

  if (loading) return <Skeleton />;

  if (!overview || overview.reason === "unassigned") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <Info size={20} className="text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1.5">No classroom assigned yet</h2>
          <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
            You're not linked to a classroom yet — this is normal right after signup. An admin needs
            to set one up for your branch, batch, and section before you'll see academic content here.
          </p>
        </div>
      </div>
    );
  }

  const { classroom, isClassRep, todayPeriods, upcomingDeadlines } = overview;
  const classroomId = classroom._id;
  const displayLabel = `${classroom.branch} ${classroom.batch} - ${classroom.section}`;
  const subjects = classroom.curriculum?.subjects || [];
  const yearOfStudy = classroom.currentSemesterNumber
    ? Math.ceil(classroom.currentSemesterNumber / 2)
    : null;
  // Display-only — the server always derives the real next number itself;
  // the client never gets to choose it.
  const nextSemesterNumber = classroom.currentSemesterNumber
    ? classroom.currentSemesterNumber + 1
    : 1;

  const handleDeleteDeadline = (id) => {
    setOverview((prev) => ({
      ...prev,
      upcomingDeadlines: prev.upcomingDeadlines.filter((d) => d._id !== id),
    }));
  };

  // ─── period modal handlers — always the classroom's one current timetable ──
  const handleSavePeriod = async (values) => {
    if (modal.period) {
      await updatePeriod(classroomId, modal.period._id, values);
    } else {
      await addPeriod(classroomId, values);
    }
    setModal(null);
    fetchOverview();
  };

  const handleDeletePeriod = async () => {
    await deletePeriod(classroomId, modal.period._id);
    setModal(null);
    fetchOverview();
  };

  // ─── destructive: permanently clears periods/curriculum and advances
  // currentSemesterNumber — nothing is archived, confirmed explicitly first ──
  const handleAdvanceSemester = async () => {
    setActionError("");
    setAdvancing(true);
    try {
      await startNextSemester(classroomId);
      setShowAdvanceConfirm(false);
      fetchOverview();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to advance the semester.");
      setShowAdvanceConfirm(false);
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {modal && (
        <PeriodFormModal
          initial={modal.period}
          day={modal.day}
          subjects={subjects}
          onSave={handleSavePeriod}
          onDelete={handleDeletePeriod}
          onClose={() => setModal(null)}
        />
      )}

      {showAdvanceConfirm && (
        <ConfirmModal
          title={`Start Semester ${nextSemesterNumber}?`}
          message={`Starting the next semester will permanently clear the current timetable and switch this classroom to Semester ${nextSemesterNumber}. This cannot be undone.`}
          confirmLabel={advancing ? "Starting..." : "Clear and start"}
          loading={advancing}
          onConfirm={handleAdvanceSemester}
          onCancel={() => setShowAdvanceConfirm(false)}
        />
      )}

      {/* ── Classroom Header ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{displayLabel}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {classroom.currentSemesterNumber && (
                <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                  Semester {classroom.currentSemesterNumber}
                  {yearOfStudy ? ` · Year ${yearOfStudy}` : ""}
                </span>
              )}
              {classroom.classRepresentative && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  CR: {classroom.classRepresentative.firstName} {classroom.classRepresentative.lastName}
                </span>
              )}
            </div>
          </div>
          {isClassRep && (
            <Link
              to={`/classroom/${classroomId}/create-notice`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-all"
            >
              <Plus size={12} /> Post Notice
            </Link>
          )}
        </div>
      </div>

      {actionError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs text-red-700">{actionError}</p>
        </div>
      )}

      {/* ── Semester lifecycle (CR / superadmin only) ── */}
      {isClassRep && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-gray-400 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {classroom.currentSemesterNumber ? "Advance to Next Semester" : "Start First Semester"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {classroom.currentSemesterNumber
                    ? "Permanently clears the current timetable and switches to the next semester's curriculum."
                    : "Sets up this classroom's first semester using the matching curriculum."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAdvanceConfirm(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-all"
            >
              {classroom.currentSemesterNumber
                ? `Start Semester ${nextSemesterNumber}`
                : "Start Semester 1"}
            </button>
          </div>
        </div>
      )}

      {/* ── Academic Notices ── */}
      <NoticeFeed
        targetType="classroom"
        targetId={classroomId}
        title="Academic Notices"
        canPost={isClassRep}
        showActions={isClassRep}
      />

      {/* ── Upcoming Deadlines ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Upcoming Deadlines</h3>
            {upcomingDeadlines.length > 0 && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {upcomingDeadlines.length}
              </span>
            )}
          </div>
          {isClassRep && classroom.currentSemesterNumber && (
            <Link
              to={`/academics/${classroomId}/deadline/form`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-all"
            >
              <Plus size={12} /> Add Deadline
            </Link>
          )}
        </div>
        {upcomingDeadlines.length > 0 ? (
          <div className="space-y-2">
            {upcomingDeadlines.map((deadline) => (
              <DeadlineCard
                key={deadline._id}
                deadline={deadline}
                classroomId={classroomId}
                isClassRep={isClassRep}
                onDelete={handleDeleteDeadline}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No upcoming deadlines." />
        )}
      </div>

      {/* ── Today's Classes ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Today's Classes</h3>
        </div>
        {todayPeriods.length > 0 ? (
          <div className="space-y-2">
            {[...todayPeriods]
              .sort((a, b) => a.startTime - b.startTime)
              .map((period) => {
                const subject = subjects.find((s) => s._id === period.subject);
                return (
                  <div
                    key={period._id}
                    className="flex items-center gap-4 p-3.5 bg-white border border-gray-100 border-l-4 border-l-blue-400 rounded-xl"
                  >
                    <div className="flex-shrink-0 text-center w-20">
                      <p className="text-xs font-bold text-gray-900">{minutesToLabel(period.startTime)}</p>
                      <p className="text-xs text-gray-400">{minutesToLabel(period.endTime)}</p>
                    </div>
                    <div className="w-px self-stretch bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {subject?.name || "Unknown subject"}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {period.faculty && <span className="text-xs text-gray-400">{period.faculty}</span>}
                        {period.room && <span className="text-xs text-gray-400">{period.room}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <EmptyState message="No classes today." />
        )}
      </div>

      {/* ── Timetable ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Timetable</h3>
        </div>
        {classroom.curriculum ? (
          <TimetableGrid
            periods={classroom.periods}
            subjects={subjects}
            editable={isClassRep}
            onAddClick={(day) => setModal({ day, period: null })}
            onEditClick={(period) => setModal({ day: period.day, period })}
            onDeleteClick={(period) => setModal({ day: period.day, period })}
          />
        ) : (
          <EmptyState message="No current semester yet." />
        )}
      </div>

      {/* ── Subjects (read-only for everyone) ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={14} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Subjects</h3>
        </div>
        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {subjects.map((subject) => (
              <div
                key={subject._id}
                className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {subject.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{subject.name}</p>
                  {subject.code && <p className="text-xs text-gray-400">{subject.code}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No subjects found for the current semester." />
        )}
      </div>
    </div>
  );
};

export default Classroom;
