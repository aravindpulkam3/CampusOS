import { useState } from "react";
import { Pin, Archive, Trash2, Paperclip, ChevronDown, ChevronUp } from "lucide-react";
import { togglePinNotice, archiveNotice, deleteNotice } from "../../api/notice.api";
import useAuth from "../../hooks/useAuth";

// ── Config ────────────────────────────────────────────────────
const priorityConfig = {
  low:    { bar: "bg-gray-200",   label: "",        badge: "" },
  normal: { bar: "bg-gray-300",   label: "",        badge: "" },
  high:   { bar: "bg-amber-400",  label: "High",    badge: "text-amber-700 bg-amber-50 border-amber-100" },
  urgent: { bar: "bg-red-500",    label: "Urgent",  badge: "text-red-700 bg-red-50 border-red-100" },
};

const noticeTypeLabel = {
  announcement:    "Announcement",
  update:          "Update",
  deadline:        "Deadline",
  schedule_change: "Schedule change",
  result:          "Result",
  reminder:        "Reminder",
};

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

// ── NoticeCard ────────────────────────────────────────────────
// Props:
//   notice       — the notice document
//   onRemove     — called with notice._id after delete or archive, to remove from local list
//   showActions  — whether to show pin/archive/delete (pass true for admin/coordinator views)
const NoticeCard = ({ notice, onRemove, showActions = false }) => {
  const { user } = useAuth();
  const [expanded,  setExpanded]  = useState(false);
  const [isPinned,  setIsPinned]  = useState(notice.isPinned);
  const [loading,   setLoading]   = useState(false);

  const pCfg = priorityConfig[notice.priority] ?? priorityConfig.normal;
  const isOwner = user?._id === (notice.createdBy?._id ?? notice.createdBy);
  const canManage = showActions && (isOwner || user?.role === "superadmin");

  const handlePin = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await togglePinNotice(notice._id);
      setIsPinned((p) => !p);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleArchive = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Archive this notice?")) return;
    setLoading(true);
    try {
      await archiveNotice(notice._id);
      onRemove?.(notice._id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this notice permanently?")) return;
    setLoading(true);
    try {
      await deleteNotice(notice._id);
      onRemove?.(notice._id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all ${
      notice.priority === "urgent"
        ? "border-red-200 shadow-sm shadow-red-50"
        : isPinned
        ? "border-gray-300"
        : "border-gray-100"
    }`}>
      {/* Priority bar */}
      <div className={`h-0.5 w-full ${pCfg.bar}`} />

      <div className="px-4 py-3.5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {isPinned && <Pin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />}
            <p className="text-sm font-semibold text-gray-900 leading-snug">{notice.title}</p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {pCfg.label && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${pCfg.badge}`}>
                {pCfg.label}
              </span>
            )}
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {relativeTime(notice.createdAt)}
            </span>
          </div>
        </div>

        {/* Type + author */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
            {noticeTypeLabel[notice.noticeType] ?? notice.noticeType}
          </span>
          <span className="text-xs text-gray-400">
            by {notice.createdBy?.firstName} {notice.createdBy?.lastName}
          </span>
        </div>

        {/* Content — clamp to 2 lines, expand on click */}
        <p className={`text-xs text-gray-600 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
          {notice.content}
        </p>

        {/* Expand toggle */}
        {notice.content?.length > 120 && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mt-1.5 transition-colors"
          >
            {expanded ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> Read more</>}
          </button>
        )}

        {/* Metadata preview — rendered only when expanded and metadata is non-empty */}
        {expanded && notice.metadata && Object.keys(notice.metadata).length > 0 && (
          <div className="mt-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Details</p>
            <div className="space-y-1">
              {Object.entries(notice.metadata).map(([key, val]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="text-gray-400 capitalize min-w-[80px]">{key.replace(/([A-Z])/g, " $1")}</span>
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
                className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg hover:border-gray-400 transition-colors"
              >
                <Paperclip size={10} />
                {att.name}
              </a>
            ))}
          </div>
        )}

        {/* Actions row — only for owners or superadmin */}
        {canManage && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
            <button
              onClick={handlePin}
              disabled={loading}
              className={`flex items-center gap-1 text-xs transition-colors ${
                isPinned ? "text-gray-900 font-medium" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Pin size={11} /> {isPinned ? "Pinned" : "Pin"}
            </button>
            <button
              onClick={handleArchive}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Archive size={11} /> Archive
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
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

export default NoticeCard;