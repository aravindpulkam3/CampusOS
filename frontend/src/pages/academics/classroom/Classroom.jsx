import { useState, useEffect, useCallback, useId, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import useNow from "../../../hooks/useNow";
import {
  getClassroom,
  deleteDeadline,
  addPeriod,
  updatePeriod,
  deletePeriod,
  startNextSemester,
} from "../../../api/classroom.api";
import NoticeFeed from "../../../components/cards/NoticeFeed";
import {
  Alert,
  DateTile,
  LoadError,
  Modal,
  PageMessage,
  PageTitle,
  SectionHead,
  btn,
  btnDangerSm,
  btnGhostSm,
  btnSm,
  fieldInput,
  fieldLabel,
  note,
  panel,
  textLink,
  tone,
} from "../../../components/common/ui";
import { describeDue } from "../../../components/dashboard/format";
import { daysFromToday, formatClock } from "../../../utils/formatDate";
import Timetable, { DAYS, minutesToInputTime, timeInputToMinutes } from "./Timetable";

const DEADLINE_TYPE = {
  assignment: "Assignment",
  quiz: "Quiz",
  minor_exam: "Minor exam",
  lab_exam: "Lab exam",
  semester_exam: "Semester exam",
  project: "Project",
  general: "General",
};

// Deadlines listed before "Show more". Anything due by tomorrow is always listed.
const DEADLINES_SHOWN = 4;

const Skeleton = () => (
  <div className="animate-pulse pb-10" aria-busy="true">
    <div className="mt-1 h-4 w-24 rounded bg-soft lg:mt-4" />
    <div className="mt-2 h-9 w-72 max-w-full rounded-lg bg-soft" />
    <div className="mt-10 h-72 rounded-panel bg-soft lg:h-[480px]" />
    <div className="mt-11 space-y-3">
      <div className="h-4 w-32 rounded bg-soft" />
      <div className="h-3.5 w-2/3 rounded bg-soft" />
      <div className="h-3.5 w-1/2 rounded bg-soft" />
    </div>
  </div>
);

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
    <Modal title={isEdit ? "Edit period" : "Add period"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="period-day" className={fieldLabel}>
            Day
          </label>
          <select id="period-day" value={form.day} onChange={handleChange("day")} className={fieldInput}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="period-subject" className={fieldLabel}>
            Subject
          </label>
          <select
            id="period-subject"
            value={form.subject}
            onChange={handleChange("subject")}
            className={fieldInput}
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
            <label htmlFor="period-start" className={fieldLabel}>
              Start
            </label>
            <input
              id="period-start"
              type="time"
              value={form.startTime}
              onChange={handleChange("startTime")}
              className={fieldInput}
            />
          </div>
          <div>
            <label htmlFor="period-end" className={fieldLabel}>
              End
            </label>
            <input
              id="period-end"
              type="time"
              value={form.endTime}
              onChange={handleChange("endTime")}
              className={fieldInput}
            />
          </div>
        </div>

        <div>
          <label htmlFor="period-faculty" className={fieldLabel}>
            Faculty <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input
            id="period-faculty"
            type="text"
            placeholder="e.g. Dr. Rao"
            value={form.faculty}
            onChange={handleChange("faculty")}
            className={fieldInput}
          />
        </div>

        <div>
          <label htmlFor="period-room" className={fieldLabel}>
            Room <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input
            id="period-room"
            type="text"
            placeholder="e.g. C101"
            value={form.room}
            onChange={handleChange("room")}
            className={fieldInput}
          />
        </div>

        {/* Beside the buttons: on a phone the dialog scrolls and its top is out of view. */}
        {error && <Alert>{error}</Alert>}

        <div className="flex items-center justify-between gap-3 pt-1">
          {isEdit ? (
            <button type="button" onClick={handleDelete} disabled={deleting || saving} className={btnDangerSm}>
              {deleting ? "Deleting..." : "Delete period"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btnGhostSm}>
              Cancel
            </button>
            <button type="submit" disabled={saving || deleting} className={btnSm}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// ─── One deadline ────────────────────────────────────────────────────────────
// A row that opens when there is more to show: the description, and for the
// class rep the edit and delete controls. `reserve` keeps the right-hand labels
// in line when only some rows in the list can open.
const DeadlineRow = ({ deadline, classroomId, canManage, reserve, onDelete }) => {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const due = describeDue(deadline.dueDate);
  const expandable = !!deadline.description || canManage;

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteDeadline(classroomId, deadline._id);
      onDelete(deadline._id);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Could not delete this deadline.");
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <li>
      <div className="group relative flex min-h-16 items-center gap-4 py-3">
        <DateTile date={deadline.dueDate} />
        <div className="min-w-0 flex-1">
          {/* The full title shows once the row is open */}
          <h3
            className={`text-[15px] font-semibold leading-[1.35] tracking-[-0.018em] text-ink ${
              open ? "break-words" : "truncate"
            }`}
          >
            {expandable ? (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((p) => !p)}
                className={`block w-full text-left decoration-ink/25 underline-offset-[3px] outline-none after:absolute after:inset-0 after:rounded-lg group-hover:underline focus-visible:after:ring-2 focus-visible:after:ring-ink/25 ${
                  open ? "break-words" : "truncate"
                }`}
              >
                {deadline.title}
              </button>
            ) : (
              deadline.title
            )}
          </h3>
          <p className="mt-px truncate text-[13.5px] text-ink-2">
            {DEADLINE_TYPE[deadline.type] || DEADLINE_TYPE.general}, {formatClock(deadline.dueDate)}
          </p>
        </div>
        <span className={`flex-none whitespace-nowrap text-[13.5px] ${tone[due.tone] || "text-ink-2"}`}>
          {due.label}
        </span>
        {reserve && (
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={`-ml-2 flex-none text-ink-3 transition-transform ${open ? "rotate-180" : ""} ${
              expandable ? "" : "invisible"
            }`}
          />
        )}
      </div>

      {open && (
        <div id={panelId} className="space-y-3 pb-4 pl-14">
          {deadline.description && (
            <p className="whitespace-pre-line break-words text-[14px] leading-[1.55] text-ink-2">
              {deadline.description}
            </p>
          )}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              {confirming ? (
                <>
                  <span className="mr-1 text-[13.5px] text-ink-2">Delete this deadline?</span>
                  <button type="button" onClick={handleDelete} disabled={deleting} className={btnDangerSm}>
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={deleting}
                    className={btnGhostSm}
                  >
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to={`/academics/${classroomId}/deadline/form/${deadline._id}`}
                    state={{ deadline }}
                    className={btnGhostSm}
                  >
                    Edit
                  </Link>
                  <button type="button" onClick={() => setConfirming(true)} className={btnDangerSm}>
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
          {error && <Alert>{error}</Alert>}
        </div>
      )}
    </li>
  );
};

// ─── Semester lifecycle (CR / superadmin only) ───────────────────────────────
// A classroom with no semester yet can do nothing else, so the control leads
// the page. Once a semester is running it is a rare, destructive step and sits
// at the foot.
const SemesterControl = ({ current, next, error, onStart }) =>
  current ? (
    <section className="mt-11 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between lg:mt-14">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.018em] text-ink">Move to semester {next}</h2>
        <p className="mt-0.5 text-[13.5px] text-ink-2">
          Permanently clears the current timetable and switches to the next semester's subjects.
        </p>
        {error && (
          <div className="mt-2">
            <Alert>{error}</Alert>
          </div>
        )}
      </div>
      <button type="button" onClick={onStart} className={`flex-none ${btnDangerSm}`}>
        Start semester {next}
      </button>
    </section>
  ) : (
    <section
      className={`mt-8 flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-7 ${panel}`}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.018em] text-ink">
          This classroom has no semester yet
        </h2>
        <p className="mt-0.5 text-[13.5px] text-ink-2">
          Starting semester 1 sets up its subjects from the matching curriculum. The timetable and
          deadlines come after that.
        </p>
        {error && (
          <div className="mt-2">
            <Alert>{error}</Alert>
          </div>
        )}
      </div>
      <button type="button" onClick={onStart} className={`flex-none ${btn}`}>
        Start semester 1
      </button>
    </section>
  );

// ─── Main ─────────────────────────────────────────────────────
const Classroom = () => {
  const { user } = useAuth();
  const now = useNow();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { period, day }
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [allDeadlines, setAllDeadlines] = useState(false);
  const deadlinesHeading = useRef(null);

  const fetchOverview = useCallback(async () => {
    try {
      const { data } = await getClassroom();
      setOverview(data.data);
      setLoadError(false);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    fetchOverview();
  }, [user?._id, fetchOverview]);

  if (loading) return <Skeleton />;

  // A failed first load is not the same as having no classroom.
  if (loadError && !overview) {
    return (
      <div className="pb-10">
        <PageTitle title="Classroom" crumb="Academics" />
        <div className="mt-9">
          <LoadError
            onRetry={() => {
              setLoading(true);
              fetchOverview();
            }}
          >
            Could not load your classroom.
          </LoadError>
        </div>
      </div>
    );
  }

  if (!overview || overview.reason === "unassigned") {
    return (
      <PageMessage title="No classroom assigned yet">
        You're not linked to a classroom yet, which is normal right after signing up. An admin needs
        to set one up for your branch, batch and section before academic content appears here.
      </PageMessage>
    );
  }

  const { classroom, isClassRep, upcomingDeadlines } = overview;
  const classroomId = classroom._id;
  const hasSemester = !!classroom.currentSemesterNumber;
  const subjects = classroom.curriculum?.subjects || [];
  const yearOfStudy = hasSemester ? Math.ceil(classroom.currentSemesterNumber / 2) : null;
  // Display-only — the server always derives the real next number itself;
  // the client never gets to choose it.
  const nextSemesterNumber = hasSemester ? classroom.currentSemesterNumber + 1 : 1;
  const rep = classroom.classRepresentative;

  // Who teaches each subject to this section, read off the timetable.
  const facultyOf = new Map();
  classroom.periods.forEach((period) => {
    if (!period.faculty) return;
    const names = facultyOf.get(period.subject) || [];
    if (!names.includes(period.faculty)) facultyOf.set(period.subject, [...names, period.faculty]);
  });

  const dueByTomorrow = upcomingDeadlines.filter((d) => daysFromToday(d.dueDate) <= 1).length;
  const shownCount = Math.max(DEADLINES_SHOWN, dueByTomorrow);
  const deadlines = allDeadlines ? upcomingDeadlines : upcomingDeadlines.slice(0, shownCount);
  const hiddenCount = upcomingDeadlines.length - shownCount;
  const anyOpens = isClassRep || upcomingDeadlines.some((d) => d.description);

  // The row that had focus is gone, so park focus on the section heading.
  const handleDeleteDeadline = (id) => {
    setOverview((prev) => ({
      ...prev,
      upcomingDeadlines: prev.upcomingDeadlines.filter((d) => d._id !== id),
    }));
    deadlinesHeading.current?.focus();
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

  const semesterControl = (
    <SemesterControl
      current={classroom.currentSemesterNumber}
      next={nextSemesterNumber}
      error={actionError}
      onStart={() => setShowAdvanceConfirm(true)}
    />
  );

  return (
    <div className="pb-10 lg:pb-20">
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
        <Modal
          title={`Start semester ${nextSemesterNumber}?`}
          onClose={() => !advancing && setShowAdvanceConfirm(false)}
        >
          <p className="text-[14.5px] leading-[1.55] text-ink-2">
            {hasSemester
              ? `Starting the next semester will permanently clear the current timetable and switch this classroom to semester ${nextSemesterNumber}. This cannot be undone.`
              : "This sets up semester 1 for this classroom, using the curriculum that matches its branch."}
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanceConfirm(false)}
              disabled={advancing}
              className={btnGhostSm}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdvanceSemester}
              disabled={advancing}
              className={hasSemester ? btnDangerSm : btnSm}
            >
              {advancing ? "Starting..." : hasSemester ? "Clear and start" : "Start semester 1"}
            </button>
          </div>
        </Modal>
      )}

      <PageTitle
        crumb="Academics"
        title={`${classroom.branch} ${classroom.batch}, Section ${classroom.section}`}
      >
        {(hasSemester || rep) && (
          <p className="text-[14.5px] text-ink-2 lg:pb-1.5 lg:text-right">
            {hasSemester && `Semester ${classroom.currentSemesterNumber}, year ${yearOfStudy}`}
            {rep && (
              <span className="block text-[13.5px] text-ink-3">
                Class representative {rep.firstName} {rep.lastName}
              </span>
            )}
          </p>
        )}
      </PageTitle>

      {isClassRep && !hasSemester && semesterControl}

      <div className="mt-9 lg:mt-10">
        <Timetable
          periods={classroom.periods}
          subjects={subjects}
          now={now}
          hasSemester={!!classroom.curriculum}
          onAdd={isClassRep ? (day) => setModal({ day, period: null }) : undefined}
          onEdit={isClassRep ? (period) => setModal({ day: period.day, period }) : undefined}
        />
      </div>

      <div className="mt-11 grid grid-cols-1 gap-y-11 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-x-[72px]">
        {/* The feed draws its own section, and carries the class rep's
            "Post notice" link in its header. */}
        <NoticeFeed
          targetType="classroom"
          targetId={classroomId}
          title="Class notices"
          canPost={isClassRep}
          showActions={isClassRep}
          postTo={`/classroom/${classroomId}/create-notice`}
        />

        <section className="min-w-0">
          <SectionHead
            title="Due soon"
            headingRef={deadlinesHeading}
            linkTo={isClassRep && hasSemester ? `/academics/${classroomId}/deadline/form` : undefined}
            linkLabel="Add deadline"
          />
          {upcomingDeadlines.length > 0 ? (
            <>
              <ul className="divide-y divide-line">
                {deadlines.map((deadline) => (
                  <DeadlineRow
                    key={deadline._id}
                    deadline={deadline}
                    classroomId={classroomId}
                    canManage={isClassRep}
                    reserve={anyOpens}
                    onDelete={handleDeleteDeadline}
                  />
                ))}
              </ul>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setAllDeadlines((p) => !p)}
                  aria-expanded={allDeadlines}
                  className={`mt-2 ${textLink}`}
                >
                  {allDeadlines ? "Show fewer" : `Show ${hiddenCount} more`}
                </button>
              )}
            </>
          ) : (
            <p className={note}>No upcoming deadlines.</p>
          )}
        </section>
      </div>

      {/* Subjects (read-only for everyone) */}
      {classroom.curriculum && (
        <section className="mt-11 lg:mt-14">
          <SectionHead title="Subjects" />
          {subjects.length > 0 ? (
            <ul className="grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => {
                const detail = [subject.code, ...(facultyOf.get(subject._id) || [])].filter(Boolean).join(", ");
                return (
                  <li key={subject._id} className="min-w-0 border-t border-line py-2.5">
                    <p className="truncate text-[14.5px] font-[550] tracking-[-0.015em] text-ink">
                      {subject.name}
                    </p>
                    {detail && <p className="mt-px truncate text-[13.5px] text-ink-2">{detail}</p>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={note}>No subjects found for the current semester.</p>
          )}
        </section>
      )}

      {isClassRep && hasSemester && semesterControl}
    </div>
  );
};

export default Classroom;
