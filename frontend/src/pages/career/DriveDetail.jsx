import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Download, ExternalLink, FileText, Pencil, Plus, Trash2, Upload } from "lucide-react";
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
import {
  Alert,
  Facts,
  LogoTile,
  Modal,
  PageMessage,
  PageTitle,
  Pager,
  Pill,
  SectionHead,
  Tabs,
  btnDangerSm,
  btnGhost,
  btnGhostSm,
  btnLg,
  btnSm,
  crumbLink,
  fieldInput,
  fieldLabel,
  focusRing,
  note,
  panel,
  tone,
  tableCell,
  tableHead,
} from "../../components/common/ui";
import safeHref from "../../utils/safeHref";
import { toCsv } from "../../utils/csv";
import { formatDate, toLocalDateTimeInput } from "../../utils/formatDate";
import {
  APPLICATION_STATUS,
  DRIVE_TYPE,
  JOB_TYPE,
  ROUND_STATE,
  describeDeadline,
  drivePay,
  formatRoundDate,
} from "./format";

// ─── Helpers ──────────────────────────────────────────────────
const sameId = (a, b) => String(a) === String(b);

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

const Skeleton = () => (
  <div className="animate-pulse pb-10" aria-busy="true" aria-label="Loading drive">
    <div className="flex items-center gap-4 pt-1 lg:pt-4">
      <div className="size-[60px] flex-none rounded-2xl bg-soft" />
      <div className="flex-1">
        <div className="h-4 w-32 rounded bg-soft" />
        <div className="mt-3 h-9 w-1/2 rounded-lg bg-soft" />
      </div>
    </div>
    <div className="mt-9 h-24 rounded-panel bg-soft" />
    <div className="mt-14 space-y-3">
      <div className="h-4 w-full max-w-xl rounded bg-soft" />
      <div className="h-4 w-full max-w-lg rounded bg-soft" />
    </div>
  </div>
);

// ─── Add / Edit round modal ────────────────────────────────────
const RoundFormModal = ({ initial, onClose, onSubmit, title }) => {
  const [name, setName] = useState(initial?.name || "");
  const [startDate, setStartDate] = useState(
    initial?.startDate ? toLocalDateTimeInput(initial.startDate) : "",
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div>
          <label htmlFor="round-name" className={fieldLabel}>
            Round name
          </label>
          <input
            id="round-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Online Assessment, Technical Interview"
            className={fieldInput}
          />
        </div>
        <div>
          <label htmlFor="round-start" className={fieldLabel}>
            Start date{" "}
            <span className="font-normal text-ink-3">(optional, leave blank if not announced)</span>
          </label>
          <input
            id="round-start"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={fieldInput}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhostSm}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnSm}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Shortlist upload/preview/confirm modal ────────────────────
const bucketTone = {
  warn: "border-[#f2dcae] bg-[#fff3dc] text-[#8a5300]",
  bad: "border-[#f6caca] bg-[#fdecec] text-[#b4282d]",
  quiet: "border-line-2 bg-soft text-ink-2",
  good: "border-[#bfe5cf] bg-[#e8f6ee] text-[#0b7a3e]",
};

const Bucket = ({ label, list, kind }) =>
  list?.length > 0 && (
    <div className={`rounded-xl border p-3 ${bucketTone[kind]}`}>
      <p className="mb-1 text-[13px] font-semibold">
        {label} ({list.length})
      </p>
      <p className="break-words text-[13px] opacity-90">{list.join(", ")}</p>
    </div>
  );

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

  return (
    <Modal title={`Shortlist: ${round.name}`} onClose={onClose} wide>
      {/* Errors sit beside the buttons: a long preview scrolls the dialog. */}
      {!preview ? (
        <div className="space-y-4">
          <p className="text-[14.5px] text-ink-2">
            Upload a CSV with a required{" "}
            <code className="rounded bg-soft px-1 text-[13px] text-ink">rollNumber</code> column. Other
            columns (name, email) are fine but ignored.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Shortlist CSV file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-[13.5px] text-ink-2"
          />
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className={btnGhostSm}>
              Cancel
            </button>
            <button type="button" onClick={handlePreview} disabled={loading || !file} className={btnSm}>
              {loading ? "Parsing..." : "Preview"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <p className={`rounded-xl border p-3 text-[13px] font-semibold ${bucketTone.good}`}>
              Valid, advancing ({preview.validCount})
            </p>
            <p className={`rounded-xl border p-3 text-[13px] font-semibold ${bucketTone.quiet}`}>
              Total rows in file ({preview.totalRows})
            </p>
          </div>
          <Bucket label="Duplicate roll numbers" list={preview.duplicateRollNumbers} kind="warn" />
          <Bucket label="Unknown roll numbers" list={preview.unknownRollNumbers} kind="bad" />
          <Bucket label="Never applied to this drive" list={preview.neverAppliedRollNumbers} kind="bad" />
          <Bucket
            label="Already rejected/selected (no-op)"
            list={preview.alreadyTerminalRollNumbers}
            kind="quiet"
          />

          {preview.validCount === 0 && (
            <label className={`flex items-start gap-2.5 rounded-xl border p-3 text-[13px] ${bucketTone.bad}`}>
              <input
                type="checkbox"
                checked={confirmRejectAll}
                onChange={(e) => setConfirmRejectAll(e.target.checked)}
                className="mt-0.5"
              />
              No valid students recognized. Confirming now will reject every currently active
              applicant in this round. I understand.
            </label>
          )}

          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setPreview(null)} className={btnGhostSm}>
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || (preview.validCount === 0 && !confirmRejectAll)}
              className={btnSm}
            >
              {loading ? "Confirming..." : "Confirm shortlist"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// A round's number in the sequence.
const RoundNumber = ({ n, current }) => (
  <span
    aria-hidden="true"
    className={`grid size-7 flex-none place-items-center rounded-full text-[13px] font-semibold ${
      current ? "bg-ink text-white" : "text-ink-2 ring-1 ring-inset ring-line-2"
    }`}
  >
    {n}
  </span>
);

// ─── Rounds tab ─────────────────────────────────────────────────
const RoundsTab = ({ drive, application, isCoordinator, onRefresh }) => {
  const [addOpen, setAddOpen] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [shortlistRound, setShortlistRound] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const rounds = drive.rounds || [];
  const currentIndex = rounds.findIndex((r) => sameId(r._id, drive.currentRoundId));

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
  const myStatus = application && (APPLICATION_STATUS[application.status] || APPLICATION_STATUS.active);

  return (
    <div className="max-w-3xl space-y-6">
      {addOpen && (
        <RoundFormModal
          title="Add round"
          onClose={() => setAddOpen(false)}
          onSubmit={(data) => addRound(drive._id, data).then(onRefresh)}
        />
      )}
      {editingRound && (
        <RoundFormModal
          title="Edit round"
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

      {actionError && <Alert>{actionError}</Alert>}

      {!isCoordinator && (
        <p className="flex items-center justify-between gap-4 border-b border-line pb-4 text-[14.5px]">
          <span className="text-ink-2">Your application</span>
          {myStatus ? <Pill tone={myStatus.tone}>{myStatus.label}</Pill> : <span className="text-ink-3">Not applied</span>}
        </p>
      )}

      {drive.status === "cancelled" && (
        <p className={note}>This drive has been cancelled. No further round actions are available.</p>
      )}
      {drive.status === "completed" && (
        <p className={`${note} ${tone.live}`}>
          This drive has been finished. Final outcomes are recorded on the Applicants tab.
        </p>
      )}

      {isCoordinator && isDriveActive && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => setAddOpen(true)} className={btnGhostSm}>
            <Plus size={14} aria-hidden="true" /> Add round
          </button>
          <div className="flex flex-wrap gap-2">
            {currentIndex !== -1 &&
              rounds[currentIndex].endedAt &&
              rounds[currentIndex].processedAt &&
              currentIndex === rounds.length - 1 && (
                <button
                  type="button"
                  disabled={busyId === "finish"}
                  onClick={() => withBusy("finish", () => finishDrive(drive._id))}
                  className={btnSm}
                >
                  {busyId === "finish" ? "Finishing..." : "Finish drive"}
                </button>
              )}
            <button
              type="button"
              disabled={busyId === "cancel"}
              onClick={() => {
                if (window.confirm("Cancel this drive? This cannot be undone.")) {
                  withBusy("cancel", () => cancelDrive(drive._id));
                }
              }}
              className={btnDangerSm}
            >
              Cancel drive
            </button>
          </div>
        </div>
      )}

      {currentIndex === -1 && rounds.length > 0 && isCoordinator && isDriveActive && (
        <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${panel}`}>
          <p className="text-[14.5px] text-ink-2">
            {registrationClosed
              ? "Ready to begin recruitment."
              : "Recruitment can begin once registration closes."}
          </p>
          <button
            type="button"
            disabled={!registrationClosed || busyId === rounds[0]._id}
            onClick={() => withBusy(rounds[0]._id, () => advanceRound(drive._id, rounds[0]._id))}
            className={`${btnSm} disabled:cursor-not-allowed`}
          >
            {busyId === rounds[0]._id ? "Starting..." : "Begin recruitment (round 1)"}
          </button>
        </div>
      )}

      {rounds.length === 0 ? (
        <p className={note}>No rounds have been added yet.</p>
      ) : (
        <ol className="divide-y divide-line">
          {rounds.map((round, index) => {
            // Lifecycle-derived flags — never "last array element" or "most
            // recently added". Array position is the recruitment sequence;
            // whether a round is past/current/pending is only ever relative
            // to currentIndex.
            const isCurrent = currentIndex !== -1 && index === currentIndex;
            const isPast = currentIndex !== -1 && index < currentIndex;
            const isPending = currentIndex === -1 || index > currentIndex;
            const state = ROUND_STATE[round.derivedState] || ROUND_STATE.upcoming;
            const personalizedRejection = !isCoordinator && sameId(round._id, rejectionRoundId);
            // Only meaningful on the current round's own card — the single
            // legal "next" target (currentIndex + 1), never any other pending
            // round further down the list.
            const nextRound = isCurrent ? rounds[currentIndex + 1] : null;

            return (
              <li key={round._id} className="py-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <RoundNumber n={index + 1} current={isCurrent} />
                  <div className="min-w-0 flex-1 basis-40">
                    <h3 className="break-words text-[15px] font-semibold tracking-[-0.018em] text-ink">
                      {round.name}
                    </h3>
                    <p className="text-[13.5px] text-ink-2">{formatRoundDate(round.startDate)}</p>
                  </div>
                  <Pill tone={personalizedRejection ? "bad" : state.tone}>
                    {personalizedRejection ? "Not shortlisted" : state.label}
                  </Pill>
                </div>

                {isCoordinator && isDriveActive && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-11">
                    {/* Rename/reschedule is allowed on ANY round regardless of lifecycle
                        stage (backend updateRound has no stage restriction — timeline
                        entries reference a round only by id, never a name/date snapshot,
                        so this is purely cosmetic and safe even on past/current rounds).
                        This is what lets a coordinator add a start date to the CURRENT
                        round after the fact so it can become "ongoing" and be ended. */}
                    <button type="button" onClick={() => setEditingRound(round)} className={btnGhostSm}>
                      <Pencil size={13} aria-hidden="true" /> Edit
                    </button>

                    {/* Delete stays pending-only — deleting a current/past round would
                        corrupt index-based derivation and orphan timeline.roundId refs. */}
                    {isPending && (
                      <button
                        type="button"
                        disabled={busyId === round._id}
                        onClick={() => withBusy(round._id, () => deleteRound(drive._id, round._id))}
                        className={btnDangerSm}
                      >
                        <Trash2 size={13} aria-hidden="true" /> Delete
                      </button>
                    )}

                    {isPast && <p className="text-[13.5px] text-ink-3">Completed.</p>}

                    {/* Current round: exactly one further action based on its own timestamps.
                        End Round only once it's actually ongoing (real startDate reached) —
                        not merely because it's current; a TBA/future-dated current round has
                        nothing else to do yet but get a start date set (Edit, above). */}
                    {isCurrent && round.derivedState === "ongoing" && (
                      <button
                        type="button"
                        disabled={busyId === round._id}
                        onClick={() => withBusy(round._id, () => endRound(drive._id, round._id))}
                        className={btnGhostSm}
                      >
                        {busyId === round._id ? "Ending..." : "End round"}
                      </button>
                    )}
                    {isCurrent && round.derivedState === "upcoming" && (
                      <p className="text-[13.5px] text-ink-3">
                        {round.startDate
                          ? "Waiting for this round's start date."
                          : "Use Edit to set a start date, then it can be ended."}
                      </p>
                    )}
                    {isCurrent && round.endedAt && !round.processedAt && (
                      <>
                        <button type="button" onClick={handleDownloadActive} className={btnGhostSm}>
                          <Download size={13} aria-hidden="true" /> Download active applicants CSV
                        </button>
                        <button type="button" onClick={() => setShortlistRound(round)} className={btnSm}>
                          <Upload size={13} aria-hidden="true" /> Upload shortlist
                        </button>
                      </>
                    )}
                    {isCurrent && round.processedAt && nextRound && (
                      <button
                        type="button"
                        disabled={busyId === nextRound._id}
                        onClick={() =>
                          withBusy(nextRound._id, () => advanceRound(drive._id, nextRound._id))
                        }
                        className={btnSm}
                      >
                        {busyId === nextRound._id ? "Advancing..." : `Move to next round (${nextRound.name})`}
                      </button>
                    )}
                    {isCurrent && round.processedAt && !nextRound && (
                      <p className="text-[13.5px] text-ink-3">
                        Add a round to continue, or finish the drive above.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

// ─── Applicants tab ─────────────────────────────────────────────
const th = tableHead;
const td = tableCell;

const ApplicantsTab = ({ driveId }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDriveApplications(driveId, { page, limit: 50 })
      .then((res) => {
        if (cancelled) return;
        setApplications(res.data.data.applications || []);
        setPagination(res.data.data.pagination);
      })
      .catch(() => { if (!cancelled) setApplications([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [driveId, page]);

  if (loading) return <p className={note}>Loading applicants...</p>;
  if (!applications.length) return <p className={note}>No applicants yet.</p>;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[14px]">
          <thead>
            <tr>
              <th scope="col" className={th}>Name</th>
              <th scope="col" className={th}>Roll no.</th>
              <th scope="col" className={th}>Branch</th>
              <th scope="col" className={th}>Year</th>
              <th scope="col" className={th}>CGPA</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={`${th} pr-0 text-right`}>Applied</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => {
              const status = APPLICATION_STATUS[a.status];
              return (
                <tr key={a._id}>
                  <td className={`${td} font-semibold text-ink`}>
                    {a.student?.firstName} {a.student?.lastName}
                  </td>
                  <td className={`${td} tabular-nums text-ink-2`}>{a.student?.rollNumber}</td>
                  <td className={`${td} text-ink-2`}>{a.student?.branch}</td>
                  <td className={`${td} text-ink-2`}>{a.student?.year}</td>
                  <td className={`${td} tabular-nums text-ink-2`}>{a.student?.cgpa}</td>
                  <td className={td}>{status && <Pill tone={status.tone}>{status.label}</Pill>}</td>
                  <td className={`${td} pr-0 text-right text-ink-2`}>{formatDate(a.appliedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager page={pagination.page} pages={pagination.pages} onPage={setPage}>
        {pagination.total} {pagination.total === 1 ? "applicant" : "applicants"}
      </Pager>
    </div>
  );
};

// ─── Settings tab ───────────────────────────────────────────────
const Field = ({ id, label, wide = false, children }) => (
  <div className={wide ? "sm:col-span-2" : ""}>
    <label htmlFor={id} className={fieldLabel}>
      {label}
    </label>
    {children}
  </div>
);

const SettingsTab = ({ drive, onSaved }) => {
  const [form, setForm] = useState({
    companyName: drive.companyName || "",
    role: drive.role || "",
    description: drive.description || "",
    location: drive.location || "",
    ctc: drive.ctc || "",
    stipend: drive.stipend || "",
    registrationDeadline: drive.registrationDeadline
      ? toLocalDateTimeInput(drive.registrationDeadline)
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

  const payField = drive.jobType === "internship" ? "stipend" : "ctc";

  return (
    <form onSubmit={handleSubmit} className="grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6">
      {(error || saved) && (
        <div className="sm:col-span-2">
          {error ? <Alert>{error}</Alert> : <Alert kind="ok">Saved.</Alert>}
        </div>
      )}
      <Field id="drive-company" label="Company name">
        <input id="drive-company" className={fieldInput} value={form.companyName} onChange={set("companyName")} />
      </Field>
      <Field id="drive-role" label="Role">
        <input id="drive-role" className={fieldInput} value={form.role} onChange={set("role")} />
      </Field>
      <Field id="drive-description" label="Description" wide>
        <textarea
          id="drive-description"
          rows={4}
          className={`${fieldInput} resize-none py-2.5 leading-normal`}
          value={form.description}
          onChange={set("description")}
        />
      </Field>
      <Field id="drive-location" label="Location">
        <input id="drive-location" className={fieldInput} value={form.location} onChange={set("location")} />
      </Field>
      <Field id="drive-pay" label={drive.jobType === "internship" ? "Stipend" : "CTC"}>
        <input id="drive-pay" className={fieldInput} value={form[payField]} onChange={set(payField)} />
      </Field>
      <Field id="drive-deadline" label="Registration deadline">
        <input
          id="drive-deadline"
          type="datetime-local"
          className={fieldInput}
          value={form.registrationDeadline}
          onChange={set("registrationDeadline")}
        />
      </Field>
      <Field id="drive-link" label="Application link">
        <input id="drive-link" className={fieldInput} value={form.applicationLink} onChange={set("applicationLink")} />
      </Field>
      <div className="flex justify-end sm:col-span-2">
        <button type="submit" disabled={saving} className={btnSm}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
};

// ─── Overview pieces ────────────────────────────────────────────

// What the drive asks for, beside what the student has on record. The verdict
// comes from the server (the same check that guards applying); the reasons for
// a "no" are shown with the student's status in the apply card.
const Eligibility = ({ drive, user, eligibility, forStudent }) => {
  const branches = drive.eligibleBranches || [];
  const onRecord = (value) => (value === null || value === undefined ? "Not on record" : String(value));
  const rows = [
    { label: "Branches", need: branches.length ? branches.join(", ") : "All branches", you: user?.branch },
    {
      label: "Minimum CGPA",
      need: drive.minCGPA > 0 ? String(drive.minCGPA) : "No requirement",
      you: onRecord(user?.cgpa),
    },
    {
      label: "Backlogs",
      need:
        drive.maxBacklogs > 0
          ? `Up to ${drive.maxBacklogs}`
          : drive.maxBacklogs === 0
            ? "None allowed"
            : "No limit",
      you: onRecord(user?.backlogs),
    },
    drive.minYear &&
      drive.maxYear && {
        label: "Year",
        need:
          drive.minYear === drive.maxYear
            ? `Year ${drive.minYear}`
            : `Years ${drive.minYear} to ${drive.maxYear}`,
        you: user?.year ? `Year ${user.year}` : "",
      },
  ].filter(Boolean);

  return (
    <section aria-labelledby="drive-eligibility">
      <SectionHead id="drive-eligibility" title="Eligibility" aside={forStudent ? "Yours" : undefined} />
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li
            key={row.label}
            className="grid min-h-14 grid-cols-[104px_minmax(0,1fr)_auto] items-center gap-x-4 py-3 lg:grid-cols-[150px_minmax(0,1fr)_auto]"
          >
            <span className="text-[15px] font-semibold tracking-[-0.018em] text-ink">{row.label}</span>
            <span className="min-w-0 break-words text-[14.5px] text-ink-2">{row.need}</span>
            {forStudent && <span className="text-right text-[14.5px] font-semibold text-ink">{row.you}</span>}
          </li>
        ))}
      </ul>
      {forStudent && eligibility?.eligible && (
        <p className={`mt-4 text-[14.5px] ${tone.live}`}>You meet every requirement.</p>
      )}
    </section>
  );
};

// ─── Main ─────────────────────────────────────────────────────
const DriveDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [drive, setDrive] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
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
      // Anything but a 404 is a failed request, not a missing drive.
      setLoadFailed(err.response?.status !== 404);
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
      <PageMessage
        title={loadFailed ? "Couldn't load this drive" : "Drive not found"}
        action={
          <Link to="/career/drives" className={btnGhost}>
            Back to drives
          </Link>
        }
      >
        {loadFailed
          ? "Check your connection and try again."
          : "It may have been removed, or the link is incorrect."}
      </PageMessage>
    );

  const deadline = describeDeadline(drive.registrationDeadline);
  const isClosed = !deadline || deadline.closed;
  const isCoordinator = ["superadmin", "placementCoordinator"].includes(user?.role);
  const hasApplied = !!application;
  const isEligible = eligibility ? eligibility.eligible : true;
  const ineligibilityReasons = eligibility ? eligibility.reasons : [];
  // The server refuses applications to a finished or cancelled drive, and once
  // the first round has begun, whatever the deadline says.
  const isActive = drive.status === "active";
  const hasStarted = !!drive.currentRoundId;
  const canApply = isEligible && !hasApplied && !isClosed && isActive && !hasStarted;
  const applicationHref = safeHref(drive.applicationLink);
  const brochureHref = safeHref(drive.brochureUrl);
  const pay = drivePay(drive);
  const rounds = drive.rounds || [];
  const applied = drive.applicationCount ?? 0;

  const state =
    drive.status === "cancelled"
      ? { label: "Cancelled", className: tone.urgent }
      : drive.status === "completed"
        ? { label: "Completed", className: "font-[550] text-ink-2" }
        : isClosed
          ? { label: "Applications closed", className: "font-[550] text-ink-2" }
          : hasStarted
            ? { label: "Recruitment under way", className: "font-[550] text-ink-2" }
            : { label: "Open for applications", className: tone.live };

  const myStatus = hasApplied
    ? application.status === "active"
      ? { label: "Applied", className: "text-live" }
      : application.status === "selected"
        ? { label: "Selected", className: "text-live" }
        : { label: "Rejected", className: "text-ink" }
    : !isActive
      ? { label: "Not open" }
      : isClosed
        ? { label: "Applications closed" }
        : hasStarted
          ? { label: "Recruitment has started" }
          : !isEligible
            ? { label: "Not eligible", className: "text-warn" }
            : { label: "Not yet applied" };

  const facts = [
    pay && { label: drive.jobType === "internship" ? "Stipend" : "CTC", value: pay, lead: true },
    drive.location && { label: "Location", value: drive.location },
    { label: "Job type", value: JOB_TYPE[drive.jobType] || "Not stated" },
    drive.batch && { label: "Batch", value: `${drive.batch} graduates` },
    drive.slots && { label: "Positions", value: drive.slots },
  ];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "rounds", label: "Rounds", count: rounds.length },
    ...(isCoordinator ? [{ key: "applicants", label: "Applicants", count: applied }] : []),
    ...(isCoordinator ? [{ key: "settings", label: "Settings" }] : []),
  ];

  return (
    <div className="pb-10 lg:pb-20">
      <PageTitle
        lead={<LogoTile src={drive.companyLogo} name={drive.companyName} size="lg" />}
        crumb={
          <>
            <Link to="/career" className={crumbLink}>
              Career
            </Link>{" "}
            /{" "}
            <Link to="/career/drives" className={crumbLink}>
              Drives
            </Link>
          </>
        }
        title={drive.companyName}
        sub={<span className="text-[17px] tracking-[-0.02em]">{drive.role}</span>}
      >
        <p className="text-[14.5px] lg:pb-1.5 lg:text-right">
          <span className={`block ${state.className}`}>
            <span aria-hidden="true" className="mr-2 inline-block size-[7px] rounded-full bg-current align-[1px]" />
            {state.label}
          </span>
          <span className="mt-0.5 block text-[13.5px] text-ink-3">
            {applied} applied{isClosed || !isActive ? "" : " so far"}
          </span>
        </p>
      </PageTitle>

      {/* On phones the pay leads across the full width, the rest two to a row */}
      <Facts className="mt-9" facts={facts} />

      <div className="mt-11">
        <Tabs label="Drive" tabs={tabs} value={tab} onChange={setTab} />
      </div>

      {tab === "overview" && (
        <div className="mt-9 grid grid-cols-1 gap-y-11 lg:mt-11 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-x-[72px]">
          <div className="min-w-0 space-y-11 lg:space-y-14">
            <section aria-labelledby="drive-about">
              <SectionHead id="drive-about" title="About this role" />
              {drive.description ? (
                <p className="max-w-[62ch] whitespace-pre-line break-words text-[15.5px] leading-[1.65] text-ink/90">
                  {drive.description}
                </p>
              ) : (
                <p className={note}>No description yet.</p>
              )}
              <p className="mt-3.5 text-[14.5px] text-ink-3">
                {[
                  DRIVE_TYPE[drive.driveType] && `${DRIVE_TYPE[drive.driveType]} drive.`,
                  drive.bond && `Bond: ${drive.bond}.`,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </section>

            <Eligibility drive={drive} user={user} eligibility={eligibility} forStudent={!isCoordinator} />

            <NoticeFeed
              targetType="drive"
              targetId={id}
              title="Notices for this drive"
              canPost={isCoordinator}
              showActions={isCoordinator}
              postTo={`/drive/${id}/create-notice`}
            />
          </div>

          {/* Applying leads on phones; on desktop it stays in view beside the page. */}
          <aside className="min-w-0 max-lg:order-first lg:sticky lg:top-6 lg:self-start">
            <section aria-labelledby="drive-apply" className={`p-6 ${panel}`}>
              <h2 id="drive-apply" className="text-[13px] font-normal text-ink-3">
                {isClosed ? "Applications closed" : "Applications close"}
              </h2>
              {deadline ? (
                <>
                  <p className="mt-1.5 text-2xl font-bold leading-[1.15] tracking-[-0.04em] text-ink">
                    {deadline.when}
                  </p>
                  {!deadline.closed && (
                    <p className={`mt-1 text-[14.5px] ${tone[deadline.tone] || "text-ink-2"}`}>{deadline.label}</p>
                  )}
                </>
              ) : (
                <p className="mt-1.5 text-[14.5px] text-ink-2">No deadline has been set.</p>
              )}

              {!isCoordinator && (
                <>
                  <p className="my-5 flex justify-between gap-4 border-y border-line py-3.5 text-[14.5px]">
                    <span className="text-ink-2">Your status</span>
                    <b className={`text-right font-semibold ${myStatus.className || "text-ink"}`}>
                      {myStatus.label}
                    </b>
                  </p>

                  {!hasApplied && !isClosed && !isEligible && (
                    <ul className={`space-y-0.5 text-[13.5px] ${tone.warn}`}>
                      {ineligibilityReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  )}

                  {canApply &&
                    /* External navigation only for a valid http(s) link;
                       otherwise a plain button that just registers. */
                    (applicationHref ? (
                      <>
                        <a
                          href={applicationHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleApply}
                          className={`w-full ${btnLg}`}
                        >
                          {applying ? "Processing..." : "Apply now"}
                          <ExternalLink size={15} aria-hidden="true" />
                        </a>
                        <p className="mt-3 text-[13px] leading-[1.45] text-ink-3">
                          Opens the company's application form and records your application here.
                        </p>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={handleApply} disabled={applying} className={`w-full ${btnLg}`}>
                          {applying ? "Processing..." : "Apply now"}
                        </button>
                        <p className="mt-3 text-[13px] leading-[1.45] text-ink-3">
                          External application link unavailable. Contact the placement office.
                        </p>
                      </>
                    ))}

                  {applyError && (
                    <div className="mt-3">
                      <Alert>{applyError}</Alert>
                    </div>
                  )}
                </>
              )}

              {brochureHref && (
                <a
                  href={brochureHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-4 inline-flex items-center gap-2 rounded text-[14.5px] font-medium text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink-3 ${focusRing}`}
                >
                  <FileText size={15} aria-hidden="true" /> View the brochure
                </a>
              )}
            </section>

            <section aria-labelledby="drive-rounds" className="mt-11">
              <SectionHead id="drive-rounds" title="Selection rounds" />
              {rounds.length > 0 ? (
                <ol className="divide-y divide-line">
                  {rounds.map((round, i) => (
                    <li key={round._id} className="flex min-h-[58px] items-center gap-4 py-2.5">
                      <RoundNumber n={i + 1} current={sameId(round._id, drive.currentRoundId)} />
                      <div className="min-w-0">
                        <h3 className="break-words text-[15px] font-semibold tracking-[-0.018em] text-ink">
                          {round.name}
                        </h3>
                        <p className="text-[13.5px] text-ink-2">{formatRoundDate(round.startDate)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={note}>No rounds have been added yet.</p>
              )}
            </section>
          </aside>
        </div>
      )}

      {tab === "rounds" && (
        <div className="mt-9">
          <RoundsTab
            drive={drive}
            application={application}
            isCoordinator={isCoordinator}
            onRefresh={fetchData}
          />
        </div>
      )}

      {tab === "applicants" && isCoordinator && (
        <div className="mt-9">
          <ApplicantsTab key={drive._id} driveId={drive._id} />
        </div>
      )}

      {tab === "settings" && isCoordinator && (
        <div className="mt-9">
          <SettingsTab drive={drive} onSaved={fetchData} />
        </div>
      )}
    </div>
  );
};

export default DriveDetail;
