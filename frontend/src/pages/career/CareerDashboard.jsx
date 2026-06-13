import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  ChevronRight,
  Clock,
  Bell,
  TrendingUp,
  Calendar,
  FileText,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { getCareerDashboard } from "../../api/career.api";
import NoticeFeed from "../../components/cards/NoticeFeed.jsx";

// ─── Helpers ──────────────────────────────────────────────────
const formatDeadline = (d) => {
  if (!d) return null;
  const diff = new Date(d) - new Date();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: "Closed", color: "text-gray-400" };
  if (days === 0) return { label: "Closes Today", color: "text-red-600" };
  if (days === 1) return { label: "Closes Tomorrow", color: "text-amber-600" };
  return { label: `${days} days left`, color: "text-gray-500" };
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const formatDateTime = (d) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const relativeTime = (d) => {
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const statusConfig = {
  registered: { label: "Registered", color: "bg-blue-50 text-blue-700" },
  oa_scheduled: { label: "OA Scheduled", color: "bg-amber-50 text-amber-700" },
  oa_completed: {
    label: "OA Completed",
    color: "bg-purple-50 text-purple-700",
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    color: "bg-indigo-50 text-indigo-700",
  },
  interview_completed: {
    label: "Interview Completed",
    color: "bg-teal-50 text-teal-700",
  },
  offer_received: {
    label: "Offer Received",
    color: "bg-green-50 text-green-700",
  },
  selected: { label: "Selected", color: "bg-green-50 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-700" },
  withdrawn: { label: "Withdrawn", color: "bg-gray-100 text-gray-500" },
};

const jobTypeLabel = { internship: "Internship", fulltime: "Full Time" };

// ─── Skeleton ─────────────────────────────────────────────────
const Skeleton = () => (
  <div className="max-w-5xl mx-auto animate-pulse space-y-6">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="w-20 h-3 bg-gray-100 rounded mb-3" />
          <div className="w-10 h-7 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-xl p-4 h-[72px]"
          />
        ))}
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-5 h-64" />
    </div>
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, iconBg }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs text-gray-400">{label}</p>
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}
      >
        <Icon size={13} />
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
  </div>
);

// ─── Drive Card compact ───────────────────────────────────────
const DriveCardCompact = ({ drive }) => {
  const deadline = formatDeadline(drive.registrationDeadline);
  return (
    <Link
      to={`/career/drives/${drive._id}`}
      className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
    >
      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {drive.companyLogo ? (
          <img
            src={drive.companyLogo}
            alt={drive.companyName}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <span className="text-xs font-bold text-gray-600">
            {drive.companyName?.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-gray-700">
          {drive.companyName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400 truncate">{drive.role}</p>
          <span className="text-xs text-gray-300">·</span>
          <p className="text-xs text-gray-400">{jobTypeLabel[drive.jobType]}</p>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-xs font-semibold text-gray-800">
          {drive.jobType === "internship" ? drive.stipend : drive.ctc}
        </p>
        {deadline && (
          <p className={`text-xs mt-0.5 ${deadline.color}`}>{deadline.label}</p>
        )}
      </div>
      <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
    </Link>
  );
};

// ─── Activity Card ────────────────────────────────────────────
const ActivityCard = ({ application }) => {
  const cfg = statusConfig[application.status] || statusConfig.registered;
  const activityDate =
    application.status === "oa_scheduled"
      ? application.drive?.oaDate
      : application.status === "interview_scheduled"
        ? application.drive?.interviewDate
        : null;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {application.drive?.companyLogo ? (
          <img
            src={application.drive.companyLogo}
            alt=""
            className="w-full h-full object-contain p-0.5"
          />
        ) : (
          <span className="text-xs font-bold text-gray-500">
            {application.drive?.companyName?.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate">
          {application.drive?.companyName}
        </p>
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${cfg.color}`}
        >
          {cfg.label}
        </span>
      </div>
      {activityDate && (
        <p className="text-xs text-gray-400 flex-shrink-0">
          {formatDateTime(activityDate)}
        </p>
      )}
    </div>
  );
};

// ─── Notice Card ──────────────────────────────────────────────
const NoticeCard = ({ notice }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-800 leading-snug">
        {notice.title}
      </p>
      {notice.message && (
        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
          {notice.message}
        </p>
      )}
    </div>
    <span className="text-xs text-gray-400 flex-shrink-0">
      {relativeTime(notice.createdAt)}
    </span>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────
const CareerDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCareerDashboard();
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <Skeleton />;

  const {
    upcomingDrives = [],
    recentNotices = [],
    stats = {},
    myActivities = [],
  } = data || {};

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Open Drives"
          value={stats.openDrives}
          icon={Briefcase}
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Applied"
          value={stats.applied}
          icon={FileText}
          iconBg="bg-green-50 text-green-600"
        />
        <StatCard
          label="Upcoming OA"
          value={stats.upcomingOA}
          icon={TrendingUp}
          iconBg="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Upcoming Interviews"
          value={stats.upcomingInterviews}
          icon={Calendar}
          iconBg="bg-purple-50 text-purple-600"
        />
      </div>

      {/* ── Content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left — Drives + Activities */}
        <div className="lg:col-span-2 space-y-4">
          {/* Upcoming Drives */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Upcoming Placement Drives
                </h3>
              </div>
              <Link
                to="/career/drives"
                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                View all <ChevronRight size={12} />
              </Link>
            </div>

            {upcomingDrives.length > 0 ? (
              <div className="space-y-2">
                {upcomingDrives.map((drive) => (
                  <DriveCardCompact key={drive._id} drive={drive} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No open drives right now.
              </p>
            )}
          </div>

          {/* My Activities */}
          {myActivities.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    My Upcoming Activities
                  </h3>
                </div>
                <Link
                  to="/career/my-applications"
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  View all <ChevronRight size={12} />
                </Link>
              </div>
              <div>
                {myActivities.map((app) => (
                  <ActivityCard key={app._id} application={app} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Notices */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={14} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              Placement Notices
            </h3>
          </div>

          {recentNotices.length > 0 ? (
            <NoticeFeed
              targetType="drive"
              targetId={null}
              title="Placement Notices"
              compact={true}
              canPost={["placementCoordinator", "superadmin"].includes(
                user?.role,
              )}
              showActions={["placementCoordinator", "superadmin"].includes(
                user?.role,
              )}
            />
          ) : (
            <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No recent notices.
            </p>
          )}

          {/* TODO: Link to all placement notices */}
          {recentNotices.length > 0 && (
            <button className="w-full mt-4 py-2 text-xs font-medium text-gray-500 border border-gray-100 rounded-lg hover:border-gray-300 hover:text-gray-800 transition-colors flex items-center justify-center gap-1">
              View all notices <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareerDashboard;
