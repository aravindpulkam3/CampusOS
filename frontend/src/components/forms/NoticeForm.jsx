import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { createNotice } from "../../api/notice.api";
import { getClassroom } from "../../api/classroom.api";
import { getClubDetails } from "../../api/club.api";
import { getEventById } from "../../api/event.api";
import useAuth from "../../hooks/useAuth";
import { toLocalDateInput } from "../../utils/formatDate";
import { PageMessage, btn, btnGhost, crumbLink, focusRing, tone } from "../common/ui";
import {
  Busy,
  Field,
  FormBar,
  FormSection,
  FormSheet,
  Segmented,
  describedBy,
  fixMessage,
  focusFirstError,
  inputClass,
} from "./formBits";

// ─── Config ────────────────────────────────────────────────────────────────────
// Schema targetType enum: "classroom" | "clubs" | "events" | "drive" | "platform"
// `crumb` is where the notice will show: [label, path] pairs, the last one the
// page it goes back to.
const CATEGORIES = {
  classroom: {
    label: "Class notice",
    description: "For your classroom: a class cancelled, a room changed, an exam moved.",
    crumb: (id) => [["Academics", null], ["Classroom", `/academics/classroom/${id}`]],
  },
  clubs: {
    label: "Club notice",
    description: "An urgent update for the club's followers: a meeting moved, a venue changed.",
    crumb: (id) => [["Clubs", "/community/clubs"], ["Club", `/community/clubs/${id}`]],
  },
  events: {
    label: "Event notice",
    description: "An alert for registered students: the venue changed, the timing shifted.",
    crumb: (id) => [["Events", "/community/events"], ["Event", `/community/events/${id}`]],
  },
  drive: {
    // ← "drive" not "placement"
    label: "Placement notice",
    description: "A drive update: the deadline extended, a test rescheduled.",
    crumb: (id) => [["Drives", "/career/drives"], ["Drive", `/career/drives/${id}`]],
  },
  platform: {
    label: "Platform notice",
    description: "A college-wide alert: maintenance, a policy change.",
    crumb: () => [["Admin", null], ["Notices", "/admin/notices"]],
  },
};

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

// ─── Main component ────────────────────────────────────────────────────────────
// Route: /:targetType/:targetId/create-notice  (and /admin/notices/create for platform)
// Called from: ClassroomPage, ClubDetail, EventDetail, DriveDetail, ManageNotices
const CreateNotice = () => {
  const navigate = useNavigate();
  const { targetType, targetId } = useParams();
  const { user } = useAuth();

  const resolvedType = targetType || "platform";
  const categoryConfig = CATEGORIES[resolvedType] || CATEGORIES.platform;

  // ─── Authorization States ───
  const [verifying, setVerifying] = useState(true); // Gatekeeper flag
  const [isAllowed, setIsAllowed] = useState(false); // Permission flag

  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "normal",
    expiresAt: "",
  });
  // Only meaningful for classroom notices — the server resolves the actual
  // semester id from the target classroom's current active semester; this
  // component only ever sends a boolean, never an id.
  const [scopeToCurrentSemester, setScopeToCurrentSemester] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        if (!targetType) {
          if (user.role === "superadmin") {
            setIsAllowed(true);
          }
          return;
        }

        if (user.role === "superadmin") {
          setIsAllowed(true);
          return;
        }

        let allowed = false;

        switch (targetType) {
          case "classroom": {
            const { data } = await getClassroom();
            allowed = data.data.isClassRep;
            break;
          }
          case "clubs": {
            const { data } = await getClubDetails(targetId);
            allowed = data.data.isAdmin;
            break;
          }
          case "events": {
            const { data } = await getEventById(targetId);
            allowed = data.data.isOrganizer;
            break;
          }
          case "drive": {
            allowed = user.role === "placementCoordinator";
            break;
          }
          default:
            allowed = false;
        }

        setIsAllowed(allowed);
      } catch (err) {
        console.error(err);
        setIsAllowed(false);
      } finally {
        setVerifying(false); // Lift the gatekeeper loading veil together
      }
    };

    verifyAccess();
  }, [targetType, targetId, user.role]);

  // ─── Guard Layout Renders ───

  // 1. Loading skeleton (blocks the flash of a form the viewer may not use)
  if (verifying) {
    return (
      <div className="max-w-[760px] animate-pulse pb-10" aria-busy="true">
        <div className="mt-1 h-4 w-32 rounded bg-soft lg:mt-4" />
        <div className="mt-2 h-9 w-48 rounded-lg bg-soft" />
        <div className="mt-12 h-44 rounded-[11px] bg-soft" />
      </div>
    );
  }

  // 2. Explicit access-denied screen
  if (!isAllowed) {
    return (
      <PageMessage
        title="You can't post a notice here"
        action={
          <div className="flex justify-center gap-2">
            <button type="button" onClick={() => navigate(-1)} className={btnGhost}>
              Go back
            </button>
            <Link to="/" className={btn}>
              Home
            </Link>
          </div>
        }
      >
        Only the people who run this space can post notices in it. If you think that's wrong, ask
        your coordinator.
      </PageMessage>
    );
  }

  // ─── Form Submission Logic ───
  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setErrors((p) => ({ ...p, [field]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.content.trim()) e.content = "Content is required.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      focusFirstError(errs, ["title", "content"], (key) => `notice-${key}`);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      await createNotice({
        title: form.title.trim(),
        content: form.content.trim(),
        targetType: resolvedType,
        targetId: targetId || null,
        priority: form.priority,
        expiresAt: form.expiresAt || null,
        ...(resolvedType === "classroom" ? { scopeToCurrentSemester } : {}),
      });

      const backRoutes = {
        classroom: `/academics/classroom/${targetId}`,
        clubs: `/community/clubs/${targetId}`,
        events: `/community/events/${targetId}`,
        drive: `/career/drives/${targetId}`,
        platform: "/admin/notices",
      };

      navigate(backRoutes[resolvedType] || "/", {
        state: { toast: "Notice posted." },
      });
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || "Failed to post notice. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const crumbs = categoryConfig.crumb(targetId);

  // 3. The form (only once access is confirmed)
  return (
    <FormSheet
      title={`New ${categoryConfig.label.toLowerCase()}`}
      sub={categoryConfig.description}
      crumb={crumbs.map(([label, path], i) => (
        <span key={label}>
          {i > 0 && " / "}
          {path ? (
            <Link to={path} className={crumbLink}>
              {label}
            </Link>
          ) : (
            label
          )}
        </span>
      ))}
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormSection first title="The notice">
          <Field id="notice-title" label="Title" error={errors.title} full>
            <input
              id="notice-title"
              type="text"
              placeholder="e.g. DBMS exam moved to C204"
              value={form.title}
              onChange={set("title")}
              className={inputClass(errors.title)}
              {...describedBy("notice-title", errors.title)}
            />
          </Field>
          <Field id="notice-content" label="Details" error={errors.content} full>
            <textarea
              id="notice-content"
              rows={5}
              placeholder="What changed, and what students need to know or do"
              value={form.content}
              onChange={set("content")}
              className={`${inputClass(errors.content)} resize-none py-2.5 leading-[1.55]`}
              {...describedBy("notice-content", errors.content)}
            />
          </Field>
          <Field
            id="notice-priority"
            label="Priority"
            group
            full
            hint={
              form.priority === "urgent" ? (
                <span className={tone.urgent}>
                  Urgent notices are marked in red and shown first in every feed.
                </span>
              ) : undefined
            }
          >
            <Segmented
              options={PRIORITIES}
              value={form.priority}
              onChange={(priority) => setForm((prev) => ({ ...prev, priority }))}
            />
          </Field>
          {resolvedType === "classroom" && (
            <label className="flex cursor-pointer select-none items-start gap-2.5 text-[14.5px] text-ink sm:col-span-2">
              <input
                type="checkbox"
                checked={scopeToCurrentSemester}
                onChange={(e) => setScopeToCurrentSemester(e.target.checked)}
                className={`mt-[3px] size-4 flex-none accent-ink ${focusRing}`}
              />
              <span>
                Only for the current semester
                <span className="block text-[13px] text-ink-3">
                  Leave it unticked for a notice that stays across semesters.
                </span>
              </span>
            </label>
          )}
        </FormSection>

        <FormSection title="How long it shows">
          <Field
            id="notice-expiresAt"
            label="Take it down on"
            optional
            hint="Leave it empty to keep the notice up until someone removes it."
          >
            <input
              id="notice-expiresAt"
              type="date"
              value={form.expiresAt}
              onChange={set("expiresAt")}
              min={toLocalDateInput(new Date())}
              className={inputClass()}
            />
          </Field>
        </FormSection>

        <FormBar message={submitError || fixMessage(errors)}>
          <button type="button" onClick={() => navigate(-1)} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={btn}>
            {submitting ? <Busy>Posting…</Busy> : "Post notice"}
          </button>
        </FormBar>
      </form>
    </FormSheet>
  );
};

export default CreateNotice;
