import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, BellRing, Plus, Pin, ChevronDown, ChevronUp,
  Archive, Trash2, Paperclip, Megaphone, AlertTriangle,
  Info, Clock, Zap,
} from "lucide-react";
import {
  getNotices, togglePinNotice, archiveNotice, deleteNotice,
} from "../../api/notice.api";
import useAuth from "../../hooks/useAuth";

// ── Helpers ────────────────────────────────────────────────────
const relativeTime = (d) => {
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
};

// ── Priority config ────────────────────────────────────────────
const priorityConfig = {
  urgent: {
    gradient: "from-red-500 to-rose-600",
    glow:     "shadow-red-100",
    border:   "border-red-200",
    bg:       "bg-red-50/60",
    badge:    "bg-red-500 text-white",
    icon:     Zap,
    label:    "Urgent",
    dot:      "bg-red-500 animate-pulse",
  },
  high: {
    gradient: "from-amber-400 to-orange-500",
    glow:     "shadow-amber-100",
    border:   "border-amber-200",
    bg:       "bg-amber-50/50",
    badge:    "bg-amber-400 text-white",
    icon:     AlertTriangle,
    label:    "High",
    dot:      "bg-amber-400",
  },
  normal: {
    gradient: "from-blue-400 to-indigo-500",
    glow:     "",
    border:   "border-gray-100",
    bg:       "bg-white",
    badge:    "bg-gray-100 text-gray-600",
    icon:     Info,
    label:    "Normal",
    dot:      "bg-blue-400",
  },
  low: {
    gradient: "from-gray-300 to-gray-400",
    glow:     "",
    border:   "border-gray-100",
    bg:       "bg-white",
    badge:    "bg-gray-100 text-gray-400",
    icon:     Info,
    label:    "Low",
    dot:      "bg-gray-300",
  },
};

const noticeTypeLabel = {
  announcement:    "Announcement",
  update:          "Update",
  deadline:        "Deadline",
  schedule_change: "Schedule change",
  result:          "Result",
  reminder:        "Reminder",
};

// ── Skeleton ───────────────────────────────────────────────────
const Skeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[...Array(2)].map((_, i) => (
      <div key={i} className="rounded-2xl overflow-hidden border border-gray-100">
        <div className="h-1 w-full bg-gradient-to-r from-gray-200 to-gray-100" />
        <div className="p-4 space-y-2.5">
          <div className="flex justify-between">
            <div className="w-36 h-4 bg-gray-100 rounded-lg" />
            <div className="w-12 h-4 bg-gray-100 rounded-lg" />
          </div>
          <div className="w-20 h-3 bg-gray-100 rounded-lg" />
          <div className="w-full h-3 bg-gray-100 rounded-lg" />
          <div className="w-3/4 h-3 bg-gray-100 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

// ── Notice Item ────────────────────────────────────────────────
const NoticeItem = ({ notice, onRemove, showActions }) => {
  const { user }   = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(notice.isPinned);
  const [busy,     setBusy]     = useState(false);

  const cfg     = priorityConfig[notice.priority] ?? priorityConfig.normal;
  const isOwner = user?._id === (notice.createdBy?._id ?? notice.createdBy);
  const canManage = showActions && (isOwner || user?.role === "superadmin");
  const isHighPriority = notice.priority === "urgent" || notice.priority === "high";

  const handlePin = async (e) => {
    e.stopPropagation();
    setBusy(true);
    try { await togglePinNotice(notice._id); setIsPinned((p) => !p); }
    catch (err) { console.error(err); }
    finally { setBusy(false); }
  };

  const handleArchive = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Archive this notice?")) return;
    setBusy(true);
    try { await archiveNotice(notice._id); onRemove?.(notice._id); }
    catch (err) { console.error(err); }
    finally { setBusy(false); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this notice permanently?")) return;
    setBusy(true);
    try { await deleteNotice(notice._id); onRemove?.(notice._id); }
    catch (err) { console.error(err); }
    finally { setBusy(false); }
  };

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-200
        ${cfg.border} ${cfg.bg}
        ${isHighPriority ? `shadow-md ${cfg.glow}` : "shadow-sm"}
        ${busy ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      {/* Coloured top stripe */}
      <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`} />

      <div className="px-4 py-3.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {/* Priority dot */}
            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <div className="min-w-0">
              <p className={`text-sm font-bold leading-snug ${
                isHighPriority ? "text-gray-900" : "text-gray-800"
              }`}>
                {notice.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Priority badge */}
            {(notice.priority === "urgent" || notice.priority === "high") && (
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.label}
              </span>
            )}
            {isPinned && (
              <span title="Pinned">
                <Pin size={12} className="text-gray-400" />
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={10} />
              {relativeTime(notice.createdAt)}
            </span>
          </div>
        </div>

        {/* Type + Author pill */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-xs text-gray-500 bg-white/80 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
            {noticeTypeLabel[notice.noticeType] ?? notice.noticeType}
          </span>
          <span className="text-xs text-gray-400">
            by <span className="font-medium text-gray-600">
              {notice.createdBy?.firstName} {notice.createdBy?.lastName}
            </span>
          </span>
        </div>

        {/* Content */}
        <p className={`text-xs text-gray-600 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
          {notice.content}
        </p>

        {/* Expand */}
        {notice.content?.length > 120 && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mt-1.5 transition-colors"
          >
            {expanded
              ? <><ChevronUp size={11} /> Show less</>
              : <><ChevronDown size={11} /> Read more</>}
          </button>
        )}

        {/* Metadata */}
        {expanded && notice.metadata && Object.keys(notice.metadata).length > 0 && (
          <div className="mt-3 px-3 py-2 bg-white/70 border border-gray-100 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Details</p>
            <div className="space-y-1">
              {Object.entries(notice.metadata).map(([key, val]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="text-gray-400 capitalize min-w-[80px]">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <span className="text-gray-700 font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {notice.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {notice.attachments.map((att, i) => (
              <a
                key={i}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all"
              >
                <Paperclip size={10} /> {att.name}
              </a>
            ))}
          </div>
        )}

        {/* Admin actions */}
        {canManage && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/5">
            <button
              onClick={handlePin}
              className={`flex items-center gap-1 text-xs transition-colors ${
                isPinned ? "text-gray-900 font-semibold" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Pin size={11} /> {isPinned ? "Pinned" : "Pin"}
            </button>
            <button
              onClick={handleArchive}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Archive size={11} /> Archive
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-xs text-gray-300 hover:text-red-500 transition-colors ml-auto"
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── NoticeFeed ─────────────────────────────────────────────────
// Props:
//   targetType   — "classroom" | "club" | "event" | "drive" | "platform"
//   targetId     — ObjectId of the target (omit for platform)
//   canPost      — show "Post notice" button
//   showActions  — show pin / archive / delete (admins only)
//   title        — section heading
//   compact      — fetch 3, no pagination (sidebar embeds)
const NoticeFeed = ({
  targetType,
  targetId,
  canPost     = false,
  showActions = false,
  title       = "Notices",
  compact     = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notices,    setNotices]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  const fetchNotices = useCallback(async (page = 1) => {
    setLoading(true);
    setError("");
    console.log("fetching notices");
    try {
      const res = await getNotices({
        targetType,
        targetId: targetId || undefined,
        page,
        limit: compact ? 3 : 20,
      });
      setNotices(res.data.data.notices);
      setPagination(res.data.data.pagination);
    } catch(error) {
      setError("Failed to load notices.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId, compact]);

  useEffect(() => { fetchNotices(1); }, [fetchNotices]);

  const handleRemove = (id) => setNotices((p) => p.filter((n) => n._id !== id));

  const createPath = targetId
    ? `/${targetType}/${targetId}/notices/create`
    : `/platform/notices/create`;

  const urgentCount = notices.filter(
    (n) => n.priority === "urgent" || n.priority === "high"
  ).length;

  const hasUrgent = notices.some((n) => n.priority === "urgent");

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {/* ── Gradient Header ── */}
      <div className={`px-5 py-4 flex items-center justify-between
        ${hasUrgent
          ? "bg-gradient-to-r from-red-500 to-rose-600"
          : urgentCount > 0
          ? "bg-gradient-to-r from-amber-400 to-orange-500"
          : "bg-gradient-to-r from-gray-800 to-gray-900"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {hasUrgent || urgentCount > 0
            ? <BellRing size={15} className="text-white" />
            : <Bell size={15} className="text-white/70" />
          }
          <span className="text-sm font-bold text-white tracking-tight">{title}</span>
          {!loading && urgentCount > 0 && (
            <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
              {urgentCount} {urgentCount === 1 ? "alert" : "alerts"}
            </span>
          )}
          {!loading && notices.length > 0 && urgentCount === 0 && (
            <span className="text-xs font-medium bg-white/15 text-white/80 px-2 py-0.5 rounded-full">
              {notices.length}
            </span>
          )}
        </div>

        {canPost && user && (
          <button
            onClick={() => navigate(createPath)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg backdrop-blur-sm transition-all border border-white/20"
          >
            <Plus size={12} /> Post notice
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="bg-white p-4">
        {error && (
          <p className="text-xs text-red-500 mb-3 px-1">{error}</p>
        )}

        {loading ? (
          <Skeleton />
        ) : notices.length > 0 ? (
          <>
            <div className="space-y-3">
              {notices.map((notice) => (
                <NoticeItem
                  key={notice._id}
                  notice={notice}
                  onRemove={handleRemove}
                  showActions={showActions}
                />
              ))}
            </div>

            {/* Pagination */}
            {!compact && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-50">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchNotices(p)}
                    className={`w-7 h-7 text-xs font-semibold rounded-lg border transition-all ${
                      p === pagination.page
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* View all — compact */}
            {compact && pagination.pages > 1 && (
              <button
                onClick={() => navigate(`/${targetType}/${targetId ?? "platform"}/notices`)}
                className="w-full mt-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-100 hover:border-gray-300 rounded-xl transition-all"
              >
                View all notices →
              </button>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Bell size={16} className="text-gray-300" />
            </div>
            <p className="text-xs font-medium text-gray-400">No notices yet</p>
            {canPost && user && (
              <button
                onClick={() => navigate(createPath)}
                className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                <Plus size={11} /> Post the first notice
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoticeFeed;