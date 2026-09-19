import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  MapPin,
  CheckCircle2,
  Plus,
  Pencil,
  Clock,
  Trash2,
  Upload,
  Download,
  X,
  AlertTriangle,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import {
  getDriveById,
  registerForDrive,
  getDriveApplications,
  addRound,
  updateRound,
  deleteRound,
  endRound,
  advanceRound,
  previewShortlist,
  confirmShortlist,
  finishDrive,
  cancelDrive,
  updateDrive,
} from "../../api/career.api";
import NoticeFeed from "../../components/cards/NoticeFeed";
import safeHref from "../../utils/safeHref";
import { toCsv } from "../../utils/csv";

// ─── Helpers ──────────────────────────────────────────────────
const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

const formatDateTimeWithFallback = (d) => {
  if (!d) return "—";
  const dateObj = new Date(d);
  const isMidnight = dateObj.getHours() === 0 && dateObj.getMinutes() === 0;
  const dateStr = dateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (isMidnight) {
    return `${dateStr}, 11:59 PM`;
  }
  const timeStr = dateObj.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr}, ${timeStr}`;
};

const formatRoundDate = (d) => {
  if (!d) return "Date TBA";
  const dateObj = new Date(d);
  const isMidnight = dateObj.getHours() === 0 && dateObj.getMinutes() === 0;
  const dateStr = dateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (isMidnight) {
    return `${dateStr}, Time TBA`;
  }
  const timeStr = dateObj.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr}, ${timeStr}`;
};

const formatDeadline = (d) => {
  if (!d) return null;
  const diff = new Date(d) - new Date();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diff < 0)
    return { label: "Closed", color: "text-gray-400", urgent: false };
  if (days === 0)
    return { label: "Closes today", color: "text-red-600", urgent: true };
  if (days === 1)
    return { label: "1 day left", color: "text-amber-600", urgent: true };
  return { label: `${days} days left`, color: "text-gray-500", urgent: false };
};

const jobTypeConfig = {
  internship: { label: "Internship", color: "bg-blue-50 text-blue-700" },
  fulltime: { label: "Full Time", color: "bg-violet-50 text-violet-700" },
};

const driveTypeLabel = {
  oncampus: "On Campus",
  offcampus: "Off Campus",
  poolcampus: "Pool Campus",
};

// Every label a round can show — derived server-side, never a fixed OA/HR/
// technical vocabulary. A round past the current one always reads
// "Upcoming" (never "Ongoing") no matter its own date; see backend
// utils/roundState.js.
const roundStateConfig = {
  upcoming: { label: "Upcoming", color: "bg-gray-100 text-gray-500" },
  ongoing: { label: "Ongoing", color: "bg-blue-50 text-blue-700" },
  ended_awaiting: {
    label: "Ended — Results Awaited",
    color: "bg-amber-50 text-amber-700",
  },
  processed: { label: "Results Processed", color: "bg-green-50 text-green-700" },
};

const applicationStatusConfig = {
  active: { label: "Active", color: "text-blue-700" },
  rejected: { label: "Rejected", color: "text-red-600" },
  selected: { label: "Selected", color: "text-green-700" },
};

const downloadCSV = (rows, filename) => {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ─── Skeleton ─────────────────────────────────────────────────
const Skeleton = () => (
  <div className="max-w-3xl mx-auto animate-pulse space-y-4">
    <div className="w-16 h-3 bg-gray-100 rounded" />
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="p-6 space-y-4">
        <div className="flex gap-4">
          <div className="w-14 h-14 bg-gray-100 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="w-40 h-5 bg-gray-100 rounded" />
            <div className="w-24 h-3 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Sub-components ───────────────────────────────────────────
const InfoRow = ({ label, value }) =>
  value ? (
    <div className="flex items-start gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-36 flex-shrink-0 pt-px">
        {label}
      </span>
      <span className="text-xs font-medium text-gray-800">{value}</span>
    </div>
  ) : null;

const Section = ({ title, children, action }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-50">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
    {children}
  </div>
);

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-xl w-full ${wide ? "max-w-xl" : "max-w-sm"} my-8`}
    >
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <X size={16} />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">{children}</div>
    </div>
  </div>
);

const Btn = ({ children, onClick, variant = "default", disabled, type = "button" }) => {
  const variants = {
    default:
      "border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 bg-white",
    primary: "bg-gray-900 text-white hover:bg-gray-700",
    danger:
      "border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 bg-white",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      {children}
    </button>
  );
};

// ─── Add / Edit round modal ────────────────────────────────────
const RoundFormModal = ({ initial, onClose, onSubmit, title }) => {
  const [name, setName] = useState(initial?.name || "");
  const [startDate, setStartDate] = useState(
    initial?.startDate ? initial.startDate.slice(0, 16) : "",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Round name is required.");
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        name: name.trim(),
        startDate: startDate ? new Date(startDate).toISOString() : null,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save round.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Round name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Online Assessment, Technical Interview"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Start date <span className="text-gray-400 font-normal">(optional — leave blank if TBA)</span>
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
};

// ─── Shortlist upload/preview/confirm modal ────────────────────
const ShortlistModal = ({ driveId, round, onClose, onDone }) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirmRejectAll, setConfirmRejectAll] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    if (!file) return setError("Choose a CSV file first.");
    setLoading(true);
    setError("");
    try {
      const res = await previewShortlist(driveId, round._id, file);
      setPreview(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to parse CSV.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (preview.validCount === 0 && !confirmRejectAll) return;
    setLoading(true);
    setError("");
    try {
      await confirmShortlist(driveId, round._id, preview.validRollNumbers);
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to confirm shortlist.");
    } finally {
      setLoading(false);
    }
  };

  const Bucket = ({ label, list, tone }) =>
    list?.length > 0 && (
      <div className={`rounded-lg border p-2.5 ${tone}`}>
        <p className="text-xs font-semibold mb-1">{label} ({list.length})</p>
        <p className="text-xs opacity-80 break-words">{list.join(", ")}</p>
      </div>
    );

  return (
    <Modal title={`Shortlist — ${round.name}`} onClose={onClose} wide>
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {!preview ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Upload a CSV with a required <code className="bg-gray-100 px-1 rounded">rollNumber</code> column.
            Other columns (name, email) are fine but ignored.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={handlePreview} disabled={loading || !file}>
              {loading ? "Parsing..." : "Preview"}
            </Btn>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-green-200 bg-green-50 p-2.5">
              <p className="text-xs font-semibold text-green-800">
                Valid — advancing ({preview.validCount})
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
              <p className="text-xs font-semibold text-gray-700">
                Total rows in file ({preview.totalRows})
              </p>
            </div>
          </div>
          <Bucket
            label="Duplicate roll numbers"
            list={preview.duplicateRollNumbers}
            tone="border-amber-200 bg-amber-50 text-amber-800"
          />
          <Bucket
            label="Unknown roll numbers"
            list={preview.unknownRollNumbers}
            tone="border-red-200 bg-red-50 text-red-800"
          />
          <Bucket
            label="Never applied to this drive"
            list={preview.neverAppliedRollNumbers}
            tone="border-red-200 bg-red-50 text-red-800"
          />
          <Bucket
            label="Already rejected/selected (no-op)"
            list={preview.alreadyTerminalRollNumbers}
            tone="border-gray-200 bg-gray-50 text-gray-600"
          />

          {preview.validCount === 0 && (
            <label className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
              <input
                type="checkbox"
                checked={confirmRejectAll}
                onChange={(e) => setConfirmRejectAll(e.target.checked)}
                className="mt-0.5"
              />
              No valid students recognized — confirming now will reject every
              currently active applicant in this round. I understand.
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={() => setPreview(null)}>Back</Btn>
            <Btn
              variant="primary"
              onClick={handleConfirm}
              disabled={loading || (preview.validCount === 0 && !confirmRejectAll)}
            >
              {loading ? "Confirming..." : "Confirm Shortlist"}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ─── Rounds tab ─────────────────────────────────────────────────
const RoundsTab = ({ drive, application, isCoordinator, onRefresh }) => {
  const [addOpen, setAddOpen] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [shortlistRound, setShortlistRound] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const rounds = drive.rounds || [];
  const currentIndex = rounds.findIndex(
    (r) => String(r._id) === String(drive.currentRoundId),
  );

  const rejectionRoundId =
    application?.status === "rejected"
      ? [...(application.timeline || [])]
          .reverse()
          .find((t) => t.status === "rejected")?.roundId
      : null;

  const withBusy = async (id, fn) => {
    setBusyId(id);
    setActionError("");
    try {
      await fn();
      await onRefresh();
    } catch (err) {
      setActionError(err.response?.data?.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDownloadActive = async () => {
    try {
      // The server caps a page at 200, so fetch every page until `total`.
      const PAGE_SIZE = 200;
      const applications = [];
      for (let page = 1; ; page++) {
        const res = await getDriveApplications(drive._id, {
          status: "active",
          limit: PAGE_SIZE,
          page,
        });
        const { applications: batch = [], pagination } = res.data.data;
        applications.push(...batch);
        if (!batch.length || applications.length >= (pagination?.total ?? 0)) break;
      }
      const rows = [["rollNumber", "name", "email"]];
      applications.forEach((a) => {
        rows.push([
          a.student?.rollNumber,
          `${a.student?.firstName || ""} ${a.student?.lastName || ""}`.trim(),
          a.student?.email,
        ]);
      });
      downloadCSV(rows, `${drive.companyName}-active-applicants.csv`);
    } catch (err) {
      setActionError("Failed to export applicants.");
    }
  };

  const registrationClosed = new Date() >= new Date(drive.registrationDeadline);
  const isDriveActive = drive.status === "active";

  return (
    <div className="space-y-4">
      {addOpen && (
        <RoundFormModal
          title="Add Round"
          onClose={() => setAddOpen(false)}
          onSubmit={(data) => addRound(drive._id, data).then(onRefresh)}
        />
      )}
      {editingRound && (
        <RoundFormModal
          title="Edit Round"
          initial={editingRound}
          onClose={() => setEditingRound(null)}
          onSubmit={(data) => updateRound(drive._id, editingRound._id, data).then(onRefresh)}
        />
      )}
      {shortlistRound && (
        <ShortlistModal
          driveId={drive._id}
          round={shortlistRound}
          onClose={() => setShortlistRound(null)}
          onDone={() => {
            setShortlistRound(null);
            onRefresh();
          }}
        />
      )}

      {actionError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700">{actionError}</p>
        </div>
      )}

      {!isCoordinator && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Your Application
          </span>
          <span
            className={`text-sm font-semibold ${application ? applicationStatusConfig[application.status]?.color : "text-gray-400"}`}
          >
            {application ? applicationStatusConfig[application.status]?.label : "Not applied"}
          </span>
        </div>
      )}

      {drive.status === "cancelled" && (
        <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-600">
          This drive has been cancelled. No further round actions are available.
        </div>
      )}
      {drive.status === "completed" && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
          This drive has been finished — final outcomes are recorded on the Applicants tab.
        </div>
      )}

      {isCoordinator && isDriveActive && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Btn onClick={() => setAddOpen(true)}>
            <Plus size={12} /> Add Round
          </Btn>
          <div className="flex gap-2">
            {currentIndex !== -1 &&
              rounds[currentIndex].endedAt &&
              rounds[currentIndex].processedAt &&
              currentIndex === rounds.length - 1 && (
                <Btn
                  variant="primary"
                  disabled={busyId === "finish"}
                  onClick={() =>
                    withBusy("finish", () => finishDrive(drive._id))
                  }
                >
                  {busyId === "finish" ? "Finishing..." : "Finish Drive"}
                </Btn>
              )}
            <Btn
              variant="danger"
              disabled={busyId === "cancel"}
              onClick={() => {
                if (window.confirm("Cancel this drive? This cannot be undone.")) {
                  withBusy("cancel", () => cancelDrive(drive._id));
                }
              }}
            >
              Cancel Drive
            </Btn>
          </div>
        </div>
      )}

      {currentIndex === -1 && rounds.length > 0 && isCoordinator && isDriveActive && (
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs text-blue-700">
            {registrationClosed
              ? "Ready to begin recruitment."
              : "Recruitment can begin once registration closes."}
          </p>
          <Btn
            variant="primary"
            disabled={!registrationClosed || busyId === rounds[0]._id}
            onClick={() => withBusy(rounds[0]._id, () => advanceRound(drive._id, rounds[0]._id))}
          >
            {busyId === rounds[0]._id ? "Starting..." : "Begin Recruitment (Round 1)"}
          </Btn>
        </div>
      )}

      {rounds.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-8">
          No rounds have been added yet.
        </p>
      )}

      <div className="space-y-3">
        {rounds.map((round, index) => {
          // Lifecycle-derived flags — never "last array element" or "most
          // recently added". Array position is the recruitment sequence;
          // whether a round is past/current/pending is only ever relative
          // to currentIndex.
          const isCurrent = currentIndex !== -1 && index === currentIndex;
          const isPast = currentIndex !== -1 && index < currentIndex;
          const isPending = currentIndex === -1 || index > currentIndex;
          const cfg = roundStateConfig[round.derivedState] || roundStateConfig.upcoming;
          const personalizedRejection =
            !isCoordinator && String(round._id) === String(rejectionRoundId);
          // Only meaningful on the current round's own card — the single
          // legal "next" target (currentIndex + 1), never any other pending
          // round further down the list.
          const nextRound = isCurrent ? rounds[currentIndex + 1] : null;

          return (
            <div
              key={round._id}
              className={`bg-white border rounded-xl p-4 ${isCurrent ? "border-gray-300" : "border-gray-100"}`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-white font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{round.name}</p>
                    <p className="text-xs text-gray-400">
                      {round.startDate ? formatRoundDate(round.startDate) : "Date TBA"}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${personalizedRejection ? "bg-red-50 text-red-700" : cfg.color}`}
                >
                  {personalizedRejection ? "Not Shortlisted" : cfg.label}
                </span>
              </div>

              {isCoordinator && isDriveActive && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
                  {/* Rename/reschedule is allowed on ANY round regardless of lifecycle
                      stage (backend updateRound has no stage restriction — timeline
                      entries reference a round only by id, never a name/date snapshot,
                      so this is purely cosmetic and safe even on past/current rounds).
                      This is what lets a coordinator add a start date to the CURRENT
                      round after the fact so it can become "ongoing" and be ended. */}
                  <Btn onClick={() => setEditingRound(round)}>
                    <Pencil size={11} /> Edit
                  </Btn>

                  {/* Delete stays pending-only — deleting a current/past round would
                      corrupt index-based derivation and orphan timeline.roundId refs. */}
                  {isPending && (
                    <Btn
                      variant="danger"
                      disabled={busyId === round._id}
                      onClick={() =>
                        withBusy(round._id, () => deleteRound(drive._id, round._id))
                      }
                    >
                      <Trash2 size={11} /> Delete
                    </Btn>
                  )}

                  {isPast && (
                    <p className="text-xs text-gray-400 self-center">Completed.</p>
                  )}

                  {/* Current round: exactly one further action based on its own timestamps.
                      End Round only once it's actually ongoing (real startDate reached) —
                      not merely because it's current; a TBA/future-dated current round has
                      nothing else to do yet but get a start date set (Edit, above). */}
                  {isCurrent && round.derivedState === "ongoing" && (
                    <Btn
                      disabled={busyId === round._id}
                      onClick={() => withBusy(round._id, () => endRound(drive._id, round._id))}
                    >
                      {busyId === round._id ? "Ending..." : "End Round"}
                    </Btn>
                  )}
                  {isCurrent && round.derivedState === "upcoming" && (
                    <p className="text-xs text-gray-400 self-center">
                      {round.startDate
                        ? "Waiting for this round's start date."
                        : "Use Edit to set a start date, then it can be ended."}
                    </p>
                  )}
                  {isCurrent && round.endedAt && !round.processedAt && (
                    <>
                      <Btn onClick={handleDownloadActive}>
                        <Download size={11} /> Download Active Applicants CSV
                      </Btn>
                      <Btn variant="primary" onClick={() => setShortlistRound(round)}>
                        <Upload size={11} /> Upload Shortlist
                      </Btn>
                    </>
                  )}
                  {isCurrent && round.processedAt && nextRound && (
                    <Btn
                      variant="primary"
                      disabled={busyId === nextRound._id}
                      onClick={() =>
                        withBusy(nextRound._id, () => advanceRound(drive._id, nextRound._id))
                      }
                    >
                      {busyId === nextRound._id ? "Advancing..." : `Move to Next Round (${nextRound.name})`}
                    </Btn>
                  )}
                  {isCurrent && round.processedAt && !nextRound && (
                    <p className="text-xs text-gray-400 self-center">
                      Add a round to continue, or finish the drive above.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Applicants tab ─────────────────────────────────────────────
const ApplicantsTab = ({ driveId }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDriveApplications(driveId, { limit: 200 })
      .then((res) => setApplications(res.data.data.applications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [driveId]);

  if (loading) return <p className="text-xs text-gray-400 py-8 text-center">Loading applicants...</p>;
  if (!applications.length)
    return <p className="text-xs text-gray-400 py-8 text-center">No applicants yet.</p>;

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 text-gray-400">
            <th className="text-left font-medium px-4 py-2.5">Name</th>
            <th className="text-left font-medium px-4 py-2.5">Roll No.</th>
            <th className="text-left font-medium px-4 py-2.5">Branch</th>
            <th className="text-left font-medium px-4 py-2.5">Year</th>
            <th className="text-left font-medium px-4 py-2.5">CGPA</th>
            <th className="text-left font-medium px-4 py-2.5">Status</th>
            <th className="text-left font-medium px-4 py-2.5">Applied</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => (
            <tr key={a._id} className="border-b border-gray-50 last:border-0">
              <td className="px-4 py-2.5 font-medium text-gray-800">
                {a.student?.firstName} {a.student?.lastName}
              </td>
              <td className="px-4 py-2.5 text-gray-500">{a.student?.rollNumber}</td>
              <td className="px-4 py-2.5 text-gray-500">{a.student?.branch}</td>
              <td className="px-4 py-2.5 text-gray-500">{a.student?.year}</td>
              <td className="px-4 py-2.5 text-gray-500">{a.student?.cgpa}</td>
              <td className="px-4 py-2.5">
                <span className={applicationStatusConfig[a.status]?.color}>
                  {applicationStatusConfig[a.status]?.label}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-400">{formatDate(a.appliedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Settings tab ───────────────────────────────────────────────
const SettingsTab = ({ drive, onSaved }) => {
  const [form, setForm] = useState({
    companyName: drive.companyName || "",
    role: drive.role || "",
    description: drive.description || "",
    location: drive.location || "",
    ctc: drive.ctc || "",
    stipend: drive.stipend || "",
    registrationDeadline: drive.registrationDeadline
      ? drive.registrationDeadline.slice(0, 16)
      : "",
    applicationLink: drive.applicationLink || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateDrive(drive._id, {
        ...form,
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 size={13} className="text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700">Saved.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Company Name</label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            value={form.companyName}
            onChange={set("companyName")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            value={form.role}
            onChange={set("role")}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 resize-none"
          value={form.description}
          onChange={set("description")}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Location</label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            value={form.location}
            onChange={set("location")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            {drive.jobType === "internship" ? "Stipend" : "CTC"}
          </label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            value={drive.jobType === "internship" ? form.stipend : form.ctc}
            onChange={set(drive.jobType === "internship" ? "stipend" : "ctc")}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Registration Deadline</label>
          <input
            type="datetime-local"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            value={form.registrationDeadline}
            onChange={set("registrationDeadline")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Application Link</label>
          <input
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            value={form.applicationLink}
            onChange={set("applicationLink")}
          />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Btn type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Btn>
      </div>
    </form>
  );
};

// ─── Main ─────────────────────────────────────────────────────
const DriveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [drive, setDrive] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [tab, setTab] = useState("overview");

  const fetchData = useCallback(async () => {
    try {
      const driveRes = await getDriveById(id);
      const {
        drive: fetchedDrive,
        eligibility: fetchedEligibility,
        myApplication,
      } = driveRes.data.data;
      setDrive(fetchedDrive);
      setEligibility(fetchedEligibility);
      setApplication(myApplication);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApply = async () => {
    setApplying(true);
    setApplyError("");
    try {
      await registerForDrive(id);
      await fetchData();
    } catch (err) {
      setApplyError(
        err.response?.data?.message || "Failed to register. Try again.",
      );
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <Skeleton />;
  if (!drive)
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-sm text-gray-400 mb-3">Drive not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-gray-500 underline"
        >
          Go back
        </button>
      </div>
    );

  const isClosed = drive.registrationDeadline
    ? new Date(drive.registrationDeadline) < new Date()
    : true;
  const deadline = formatDeadline(drive.registrationDeadline);
  const jobCfg = jobTypeConfig[drive.jobType] || jobTypeConfig.fulltime;
  const isCoordinator = ["superadmin", "placementCoordinator"].includes(user?.role);
  const hasApplied = !!application;
  const isEligible = eligibility ? eligibility.eligible : true;
  const ineligibilityReasons = eligibility ? eligibility.reasons : [];
  const canApply = isEligible && !hasApplied && !isClosed;
  const applicationHref = safeHref(drive.applicationLink);
  const brochureHref = safeHref(drive.brochureUrl);
  const compensation =
    drive.jobType === "internship" ? drive.stipend : drive.ctc;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "rounds", label: "Rounds" },
    ...(isCoordinator ? [{ key: "applicants", label: "Applicants" }] : []),
    ...(isCoordinator ? [{ key: "settings", label: "Settings" }] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={13} /> Back
      </button>

      {/* ── Company header card ── */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {drive.companyLogo ? (
                <img
                  src={drive.companyLogo}
                  alt={drive.companyName}
                  className="w-full h-full object-contain p-1.5"
                />
              ) : (
                <span className="text-lg font-bold text-gray-500">
                  {drive.companyName?.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  {drive.companyName}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{drive.role}</p>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full
                  ${isClosed ? "bg-gray-100 text-gray-400" : "bg-green-50 text-green-700"}`}
                >
                  {isClosed ? "Closed" : "Open"}
                </span>
                {drive.status !== "active" && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-900 text-white capitalize">
                    {drive.status}
                  </span>
                )}
                <span
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${jobCfg.color}`}
                >
                  {jobCfg.label}
                </span>
                {drive.driveType && (
                  <span className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                    {driveTypeLabel[drive.driveType]}
                  </span>
                )}
                {drive.location && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                    <MapPin size={9} /> {drive.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-50 px-5 py-4 flex items-center gap-6 bg-gray-50/50">
          {compensation && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                {drive.jobType === "internship" ? "Stipend" : "CTC"}
              </p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{compensation}</p>
            </div>
          )}
          {compensation && drive.registrationDeadline && (
            <div className="w-px h-8 bg-gray-200" />
          )}
          {drive.registrationDeadline && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                Registration Deadline
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-semibold text-gray-800">
                  {formatDateTimeWithFallback(drive.registrationDeadline)}
                </p>
                {deadline && (
                  <span className={`flex items-center gap-1 text-xs font-medium ${deadline.color}`}>
                    <Clock size={10} /> {deadline.label}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* ── Registration / Apply card ── */}
          {!isCoordinator && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Your Status
                  </p>
                  {hasApplied ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green-600" />
                      <p className="text-sm font-semibold text-green-700">Registered</p>
                    </div>
                  ) : isClosed ? (
                    <p className="text-sm font-medium text-gray-400">Registration closed</p>
                  ) : !isEligible ? (
                    <p className="text-sm font-medium text-amber-600">Not eligible</p>
                  ) : (
                    <p className="text-sm font-medium text-gray-600">Not yet registered</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {!hasApplied && !isClosed && !isEligible && (
                    <div className="text-right">
                      <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                        <p className="text-xs font-medium text-gray-400">Not Eligible</p>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        {ineligibilityReasons.map((r, i) => (
                          <p key={i} className="text-xs text-amber-600">{r}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {canApply && (
                    <div className="flex flex-col items-end gap-1.5">
                      {/* External navigation only for a valid http(s) link;
                          otherwise a plain button that just registers. */}
                      {applicationHref ? (
                        <a
                          href={applicationHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleApply}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-700 transition-colors"
                        >
                          <ExternalLink size={12} />
                          {applying ? "Processing..." : "Apply Now"}
                        </a>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleApply}
                            disabled={applying}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-60"
                          >
                            {applying ? "Processing..." : "Apply Now"}
                          </button>
                          <p className="text-xs text-gray-400">
                            External application link unavailable — contact the placement office.
                          </p>
                        </>
                      )}
                      {applyError && <p className="text-xs text-red-500">{applyError}</p>}
                    </div>
                  )}

                  {brochureHref && (
                    <a
                      href={brochureHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <FileText size={11} /> View Brochure
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {drive.description && (
            <Section title="About This Role">
              <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                {drive.description}
              </p>
            </Section>
          )}

          <Section title="Job Details">
            <InfoRow label="Role" value={drive.role} />
            <InfoRow label="Job Type" value={jobTypeConfig[drive.jobType]?.label} />
            <InfoRow label="Drive Type" value={driveTypeLabel[drive.driveType]} />
            {drive.jobType === "fulltime" && <InfoRow label="CTC" value={drive.ctc} />}
            {drive.jobType === "internship" && <InfoRow label="Stipend" value={drive.stipend} />}
            {drive.bond && <InfoRow label="Bond" value={drive.bond} />}
            {drive.location && <InfoRow label="Location" value={drive.location} />}
            {drive.batch && <InfoRow label="Batch" value={`${drive.batch} graduates`} />}
            {drive.slots && <InfoRow label="Slots" value={`${drive.slots} positions`} />}
          </Section>

          <Section title="Eligibility">
            <InfoRow
              label="Eligible Branches"
              value={drive.eligibleBranches?.length ? drive.eligibleBranches.join(", ") : "All branches"}
            />
            <InfoRow label="Min CGPA" value={drive.minCGPA > 0 ? `${drive.minCGPA}` : "No requirement"} />
            <InfoRow
              label="Max Backlogs"
              value={drive.maxBacklogs > 0 ? `${drive.maxBacklogs}` : "No backlogs allowed"}
            />
            {drive.minYear && drive.maxYear && (
              <InfoRow
                label="Year"
                value={drive.minYear === drive.maxYear ? `Year ${drive.minYear}` : `Years ${drive.minYear} – ${drive.maxYear}`}
              />
            )}
          </Section>

          <Section
            title="Drive Notices"
            action={
              isCoordinator && (
                <Link
                  to={`/drive/${id}/create-notice`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-all"
                >
                  <Plus size={12} /> Post Notice
                </Link>
              )
            }
          >
            <NoticeFeed
              targetType="drive"
              targetId={id}
              canPost={isCoordinator}
              showActions={isCoordinator}
            />
          </Section>
        </>
      )}

      {tab === "rounds" && (
        <RoundsTab
          drive={drive}
          application={application}
          isCoordinator={isCoordinator}
          onRefresh={fetchData}
        />
      )}

      {tab === "applicants" && isCoordinator && <ApplicantsTab driveId={drive._id} />}

      {tab === "settings" && isCoordinator && (
        <SettingsTab drive={drive} onSaved={fetchData} />
      )}

      <div className="pb-8" />
    </div>
  );
};

export default DriveDetail;
