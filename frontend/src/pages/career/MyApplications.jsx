import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { getMyApplications } from "../../api/career.api";

// ─── Helpers ──────────────────────────────────────────────────
const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (d) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

// Intentionally simple: active/rejected/selected only. No fixed round
// vocabulary — round names and their state come from the drive itself.
const statusConfig = {
  active: { label: "Active", color: "bg-blue-50 text-blue-700", dot: "bg-blue-400" },
  selected: { label: "Selected", color: "bg-green-50 text-green-700", dot: "bg-green-500" },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-700", dot: "bg-red-400" },
};

const roundStateLabel = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  ended_awaiting: "Ended — Results Awaited",
  processed: "Results Processed",
};

// ─── Application Card ─────────────────────────────────────────
const ApplicationCard = ({ application }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[application.status] || statusConfig.active;
  const isTerminal = application.status !== "active";
  const isRejected = application.status === "rejected";
  const isSelected = application.status === "selected";

  const rounds = application.drive?.rounds || [];
  const currentRound = rounds.find(
    (r) => String(r._id) === String(application.drive?.currentRoundId),
  );

  // For a rejected application, find the round where it actually ended —
  // personalized copy, not the drive-wide round label.
  const rejectionEntry = isRejected
    ? [...(application.timeline || [])].reverse().find((t) => t.status === "rejected")
    : null;
  const rejectionRound = rejectionEntry
    ? rounds.find((r) => String(r._id) === String(rejectionEntry.roundId))
    : null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 p-4">
        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {application.drive?.companyLogo ? (
            <img
              src={application.drive.companyLogo}
              alt=""
              className="w-full h-full object-contain p-1.5"
            />
          ) : (
            <span className="text-sm font-bold text-gray-500">
              {application.drive?.companyName?.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to={`/career/drives/${application.drive?._id}`}
                className="text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors truncate block"
              >
                {application.drive?.companyName}
              </Link>
              <p className="text-xs text-gray-400 mt-0.5">{application.drive?.role}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <p className="text-xs text-gray-400">Applied {formatDate(application.appliedAt)}</p>
          </div>
        </div>
      </div>

      {/* Current round — only for still-active applications */}
      {!isTerminal && currentRound && (
        <div className="mx-4 mb-4 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg">
          <p className="text-xs font-semibold text-gray-800">{currentRound.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {roundStateLabel[currentRound.derivedState] || "Upcoming"}
          </p>
        </div>
      )}
      {!isTerminal && !currentRound && (
        <div className="mx-4 mb-4 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg">
          <p className="text-xs text-gray-500">Recruitment hasn't started yet — you're registered.</p>
        </div>
      )}

      {/* Terminal states */}
      {isSelected && (
        <div className="mx-4 mb-4 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
          <p className="text-xs font-medium text-green-700">
            Congratulations! You have been selected.
          </p>
        </div>
      )}
      {isRejected && (
        <div className="mx-4 mb-4 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-xs text-red-600">
            {rejectionRound
              ? `Not shortlisted after ${rejectionRound.name}.`
              : "Application was not successful for this drive."}
          </p>
        </div>
      )}

      {/* Expand timeline button */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-t border-gray-50 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <span>{expanded ? "Hide" : "View"} timeline</span>
        <ChevronRight
          size={13}
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-4">
          {application.timeline?.length > 0 ? (
            <div className="space-y-3">
              {application.timeline.map((entry, i) => {
                const entryCfg = statusConfig[entry.status] || statusConfig.active;
                const round = rounds.find((r) => String(r._id) === String(entry.roundId));
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${entryCfg.dot}`} />
                      {i < application.timeline.length - 1 && (
                        <div className="w-px flex-1 bg-gray-100 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-900">
                          {round ? round.name : entryCfg.label}
                        </p>
                        <p className="text-xs text-gray-400 flex-shrink-0">
                          {formatDateTime(entry.changedAt)}
                        </p>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{entry.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-3">No timeline entries yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────
const Skeleton = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <div className="w-32 h-4 bg-gray-100 rounded" />
              <div className="w-20 h-5 bg-gray-100 rounded-full" />
            </div>
            <div className="w-24 h-3 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────
const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await getMyApplications();
        setApplications(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const filters = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "selected", label: "Selected" },
    { key: "rejected", label: "Rejected" },
  ];

  const filtered = applications.filter((app) => {
    if (filter === "all") return true;
    return app.status === filter;
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">My Applications</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? "Loading..." : `${applications.length} total applications`}
          </p>
        </div>
        <Link
          to="/career/drives"
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-400"
        >
          Browse Drives <ArrowRight size={12} />
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150
              ${
                filter === f.key
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
              }`}
          >
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1 opacity-70">
                ({applications.filter((a) => a.status === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton />
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((app) => (
            <ApplicationCard key={app._id} application={app} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-xl text-center">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Briefcase size={16} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">No applications yet</p>
          <p className="text-xs text-gray-400 mb-4">
            {filter !== "all" ? "No applications match this filter" : "Start applying to placement drives"}
          </p>
          <Link to="/career/drives" className="text-xs font-medium text-gray-900 underline underline-offset-2">
            Browse open drives
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyApplications;
