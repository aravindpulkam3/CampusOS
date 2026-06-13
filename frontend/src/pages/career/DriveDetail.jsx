import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  MapPin,
  Users,
  Award,
  Bell,
  ChevronRight,
  CheckCircle2,
  Circle,
  Plus,
  Pencil,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import {
  getDriveById,
  // getDriveNotices,
  registerForDrive,
} from "../../api/career.api";

// ─── Helpers ──────────────────────────────────────────────────
const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

const relativeTime = (d) => {
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatDeadline = (d) => {
  if (!d) return null;
  const diff = new Date(d) - new Date();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diff < 0)
    return { label: "Closed", color: "text-gray-400", urgent: false };
  if (days === 0)
    return { label: "Closes Today", color: "text-red-600", urgent: true };
  if (days === 1)
    return { label: "Tomorrow", color: "text-amber-600", urgent: true };
  return { label: `${days} days left`, color: "text-gray-600", urgent: false };
};

const statusConfig = {
  upcoming: { label: "Upcoming", color: "bg-gray-100 text-gray-600" },
  open: { label: "Open", color: "bg-green-50 text-green-700" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-500" },
};

const jobTypeConfig = {
  internship: { label: "Internship", color: "bg-blue-50 text-blue-700" },
  fulltime: { label: "Full Time", color: "bg-purple-50 text-purple-700" },
};

const driveTypeLabel = {
  oncampus: "On Campus",
  offcampus: "Off Campus",
  poolcampus: "Pool Campus",
};

// ─── Skeleton ─────────────────────────────────────────────────
const Skeleton = () => (
  <div className="max-w-3xl mx-auto animate-pulse space-y-4">
    <div className="w-20 h-4 bg-gray-100 rounded" />
    <div className="bg-white border border-gray-100 rounded-xl p-6">
      <div className="flex gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="w-40 h-5 bg-gray-100 rounded" />
          <div className="w-24 h-3 bg-gray-100 rounded" />
          <div className="flex gap-2">
            <div className="w-20 h-5 bg-gray-100 rounded-full" />
            <div className="w-20 h-5 bg-gray-100 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const InfoRow = ({ label, value }) =>
  value ? (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-32 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-xs font-medium text-gray-800">{value}</span>
    </div>
  ) : null;

const Section = ({ title, children }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5">
    <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-50">
      {title}
    </h2>
    {children}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────
const DriveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [drive, setDrive] = useState(null);
  const [notices, setNotices] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const driveRes = await getDriveById(id);

      // Correct alignment mapping for backend response package
      const {
        drive: fetchedDrive,
        eligibility: fetchedEligibility,
        myApplication,
      } = driveRes.data.data;

      setDrive(fetchedDrive);
      setEligibility(fetchedEligibility);
      // console.log(fetchedEligibility);
      setApplication(myApplication);
      // setNotices(noticesRes.data.data || []);
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
    console.log("came to handle apply")
    setApplying(true);
    setApplyError("");
    try {
      await registerForDrive(id);
      console.log("registered")
      // Re-fetch data from server to seamlessly load updated application timeline blocks
      await fetchData();
    } catch (err) {
      setApplyError(
        err.response?.data?.message || "Failed to register. Try again.",
      );
      console.log(error);
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

  const deadline = formatDeadline(drive.registrationDeadline);
  const statusCfg = statusConfig[drive.status] || statusConfig.open;
  const jobCfg = jobTypeConfig[drive.jobType] || jobTypeConfig.fulltime;

  const isAdmin = ["superadmin", "placementCoordinator"].includes(user?.role);
  const isClosed = drive.status === "closed";
  const hasApplied = !!application;

  // Uses direct server calculation logic values cleanly
  const isEligible = eligibility ? eligibility.eligible : true;
  const ineligibilityReasons = eligibility ? eligibility.reasons : [];
  // console.log(eligibility?.reasons);
  const canApply =
     isEligible && !hasApplied && !isClosed;
    // console.log(canApply);
    // const canApply=true;

  const compensation =
    drive.jobType === "internship" ? drive.stipend : drive.ctc;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* ── Company Header ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {drive.companyName}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{drive.role}</p>
              </div>
              {isAdmin && (
                <Link
                  to={`/career/drives/${id}/edit`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-all flex-shrink-0"
                >
                  <Pencil size={12} /> Edit
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusCfg.color}`}
              >
                {statusCfg.label}
              </span>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${jobCfg.color}`}
              >
                {jobCfg.label}
              </span>
              {drive.driveType && (
                <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                  {driveTypeLabel[drive.driveType]}
                </span>
              )}
              {drive.location && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin size={10} /> {drive.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {compensation && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400">
              {drive.jobType === "internship" ? "Stipend" : "CTC"}
            </p>
            <p className="text-base font-bold text-gray-900 mt-0.5">
              {compensation}
            </p>
          </div>
        )}
      </div>

      {/* ── Apply / Registration ── */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-gray-400">Registration Deadline</p>
              {deadline && (
                <span className={`text-xs font-semibold ${deadline.color}`}>
                  {deadline.label}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatDate(drive.registrationDeadline)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {hasApplied && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 size={13} className="text-green-600" />
                  <span className="text-xs font-medium text-green-700 capitalize">
                    Status: {application.status?.replace("_", " ")}
                  </span>
                </div>
              </div>
            )}

            {!hasApplied && isClosed && (
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs font-medium text-gray-500">
                  Drive Closed
                </span>
              </div>
            )}

            {!hasApplied && !isClosed && !isEligible && (
              <div className="text-right">
                <button
                  disabled
                  className="px-4 py-2 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg border border-gray-200 cursor-not-allowed"
                >
                  Not Eligible
                </button>
                <div className="mt-1.5 space-y-0.5">
                  {ineligibilityReasons.map((r, i) => (
                    <p key={i} className="text-xs text-amber-600">
                      {r}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {canApply && (
              <div className="flex flex-col items-end gap-1.5">
                <a
                  href={drive.applicationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <ExternalLink size={12} />{" "}
                  {applying ? "Processing..." : "Apply Now"}
                </a>
                {applyError && (
                  <p className="text-xs text-red-500">{applyError}</p>
                )}
                <p className="text-xs text-gray-400">Opens external portal</p>
              </div>
            )}

            {drive.brochureUrl && (
              <a
                href={drive.brochureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors mt-1"
              >
                <FileText size={12} /> View Brochure
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      {drive.description && (
        <Section title="About This Role">
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
            {drive.description}
          </p>
        </Section>
      )}
      {drive.description && <div className="mb-4" />}

      {/* ── Job Details ── */}
      <Section title="Job Details">
        <InfoRow label="Role" value={drive.role} />
        <InfoRow label="Job Type" value={jobTypeConfig[drive.jobType]?.label} />
        <InfoRow label="Drive Type" value={driveTypeLabel[drive.driveType]} />
        {drive.jobType === "fulltime" && (
          <InfoRow label="CTC" value={drive.ctc} />
        )}
        {drive.jobType === "internship" && (
          <InfoRow label="Stipend" value={drive.stipend} />
        )}
        {drive.bond && <InfoRow label="Bond" value={drive.bond} />}
        {drive.location && <InfoRow label="Location" value={drive.location} />}
        {drive.batch && (
          <InfoRow label="Batch" value={`${drive.batch} graduates`} />
        )}
        {drive.slots && (
          <InfoRow label="Slots" value={`${drive.slots} positions`} />
        )}
      </Section>
      <div className="mb-4" />

      {/* ── Eligibility ── */}
      <Section title="Eligibility">
        <InfoRow
          label="Eligible Branches"
          value={
            drive.eligibleBranches?.length
              ? drive.eligibleBranches.join(", ")
              : "All branches"
          }
        />
        <InfoRow
          label="Min CGPA"
          value={drive.minCGPA > 0 ? `${drive.minCGPA}` : "No requirement"}
        />
        <InfoRow
          label="Max Backlogs"
          value={
            drive.maxBacklogs > 0
              ? `${drive.maxBacklogs}`
              : "No backlogs allowed"
          }
        />
        {drive.minYear && drive.maxYear && (
          <InfoRow
            label="Year Constraint"
            value={`Year ${drive.minYear} – ${drive.maxYear}`}
          />
        )}
      </Section>
      <div className="mb-4" />

      {/* ── Selection Process ── */}
      {drive.selectionProcess?.length > 0 && (
        <>
          <Section title="Selection Process">
            <div className="space-y-3">
              {drive.selectionProcess.map((round, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-white font-bold">
                      {round.order || i + 1}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    {round.name}
                  </p>
                </div>
              ))}
            </div>
          </Section>
          <div className="mb-4" />
        </>
      )}

      {/* ── Placement Notices ── */}
      <Section title="Placement Notices">
        <div className="flex items-center justify-between -mt-2 mb-3">
          <span />
          {isAdmin && (
            <Link
              to={`/drive/${id}/create-notice`}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-400"
            >
              <Plus size={12} /> Post Notice
            </Link>
          )}
        </div>

        {notices.length > 0 ? (
          <div className="space-y-2">
            {notices.map((notice) => (
              <div
                key={notice._id}
                className={`flex gap-3 p-3.5 border rounded-xl ${
                  notice.priority === "high"
                    ? "bg-red-50 border-red-100 text-red-800"
                    : notice.priority === "medium"
                      ? "bg-amber-50 border-amber-100 text-amber-800"
                      : "bg-gray-50 border-gray-100 text-gray-700"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold leading-snug">
                      {notice.title}
                    </p>
                    <span className="text-xs opacity-60 flex-shrink-0">
                      {relativeTime(notice.createdAt)}
                    </span>
                  </div>
                  {notice.message && (
                    <p className="text-xs mt-1 opacity-80 leading-relaxed">
                      {notice.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No notices for this drive yet.
          </p>
        )}
      </Section>
      <div className="mb-8" />
    </div>
  );
};

export default DriveDetail;
