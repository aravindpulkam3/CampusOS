import { useEffect, useState } from "react";
import { useNavigate, useParams ,Link} from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { createNotice } from "../../api/notice.api";
import { getClassroom } from "../../api/classroom.api";
import { getClubDetails } from "../../api/club.api";
import { getEventById } from "../../api/event.api";
import { getDriveById } from "../../api/career.api";
import useAuth from "../../hooks/useAuth";

// ─── Config ────────────────────────────────────────────────────────────────────
// Schema targetType enum: "classroom" | "clubs" | "events" | "drive" | "platform"
const CATEGORIES = {
  classroom: {
    label: "Academic Notice",
    description:
      "For your classroom — class cancelled, room changed, exam rescheduled",
  },
  clubs: {
    label: "Club Notice",
    description:
      "Urgent update for club followers — meeting shifted, venue changed",
  },
  events: {
    label: "Event Notice",
    description:
      "Alert for registered students — venue changed, timing shifted",
  },
  drive: {
    // ← "drive" not "placement"
    label: "Placement Notice",
    description: "Drive update — deadline extended, test rescheduled",
  },
  platform: {
    label: "Platform Notice",
    description: "College-wide alert — maintenance, policy update",
  },
};

const PRIORITIES = [
  {
    value: "low",
    label: "Low",
    active: "bg-white text-gray-700 border-gray-400 ring-1 ring-gray-300",
  },
  {
    value: "normal",
    label: "Normal",
    active: "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200",
  },
  {
    value: "high",
    label: "High",
    active: "bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-200",
  },
  {
    value: "urgent",
    label: "Urgent",
    active: "bg-red-50 text-red-700 border-red-300 ring-1 ring-red-200",
  },
];

// ─── Reusable field atoms ──────────────────────────────────────────────────────
const Label = ({ children, required, optional }) => (
  <label className="block text-xs font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-400 ml-0.5">*</span>}
    {optional && (
      <span className="text-gray-400 font-normal ml-1">(optional)</span>
    )}
  </label>
);

const Input = (props) => (
  <input
    {...props}
    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300 transition-all"
  />
);

const Textarea = (props) => (
  <textarea
    {...props}
    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300 transition-all resize-none leading-relaxed"
  />
);

const FieldError = ({ message }) =>
  message ? <p className="text-xs text-red-500 mt-1">{message}</p> : null;

const Section = ({ title, children }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest pb-2 border-b border-gray-50">
      {title}
    </h3>
    {children}
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────
// Route: /:targetType/:targetId/notices/create  (targetId absent for platform)
// Called from: ClassroomPage, ClubDetail, EventDetail, DriveDetail, AdminPanel
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

  // 1. Loading Skeleton Panel (Blocks the auth flash completely)
  if (verifying) {
    return (
      <div className="max-w-2xl mx-auto pb-10 animate-pulse space-y-6">
        <div className="w-16 h-4 bg-gray-100 rounded mt-4" />
        <div className="space-y-2">
          <div className="w-48 h-6 bg-gray-100 rounded" />
          <div className="w-full h-3 bg-gray-100 rounded" />
        </div>
        <div className="h-40 bg-white border border-gray-100 rounded-xl" />
        <div className="h-64 bg-white border border-gray-100 rounded-xl" />
      </div>
    );
  }

  // 2. Explicit Access Denied Screen
  if (!isAllowed) {
    return (
      <div className="max-w-md mx-auto my-20 bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mx-auto mb-4 border border-red-100">
          <ShieldAlert size={22} />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1.5">Access Denied</h3>
        <p className="text-xs text-gray-400 leading-relaxed mb-6">
          You do not have the required administrative permissions to publish a notice in this space.
          If you believe this is an error, please contact your workspace coordinator.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={12} /> Go Back
          </button>
          <Link
            to="/"
            className="flex-1 px-4 py-2 text-xs font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center"
          >
            Return Home
          </Link>
        </div>
      </div>
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
        state: { toast: "Notice posted successfully." },
      });
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || "Failed to post notice. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const priorityUrgentBanner = form.priority === "urgent";

  // 3. Regular Form Render (Only hits if isAllowed is explicitly true)
  return (
    <div className="max-w-2xl mx-auto pb-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft size={13} /> Back
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-semibold text-gray-900">Post notice</h2>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {categoryConfig.label}
          </span>
        </div>
        <p className="text-xs text-gray-400">{categoryConfig.description}</p>
      </div>

      {priorityUrgentBanner && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-xs font-semibold text-red-700">Urgent</span>
          <span className="text-xs text-red-600">
            — this notice will be highlighted and shown at the top of feeds.
          </span>
        </div>
      )}

      {submitError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs text-red-700">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Section title="Notice details">
          <div>
            <Label required>Title</Label>
            <Input
              type="text"
              placeholder="e.g. DBMS exam venue changed"
              value={form.title}
              onChange={set("title")}
            />
            <FieldError message={errors.title} />
          </div>

          <div>
            <Label required>Content</Label>
            <Textarea
              rows={4}
              placeholder="Provide full details — what changed, what students need to know or do..."
              value={form.content}
              onChange={set("content")}
            />
            <FieldError message={errors.content} />
          </div>

          {resolvedType === "classroom" && (
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={scopeToCurrentSemester}
                onChange={(e) => setScopeToCurrentSemester(e.target.checked)}
                className="rounded border-gray-300"
              />
              Only show for the current semester
              <span className="text-gray-400">
                — leave unchecked for a general notice that persists across semesters
              </span>
            </label>
          )}

          <div>
            <Label>Priority</Label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, priority: p.value }))}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all duration-150 ${
                    form.priority === p.value
                      ? p.active
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Timing">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label optional>Expires at</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={set("expiresAt")}
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank to keep indefinitely</p>
            </div>
          </div>
        </Section>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Posting...
              </>
            ) : (
              "Post notice"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateNotice;

