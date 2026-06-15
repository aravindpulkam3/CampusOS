import { useState } from "react";
import {
  Pin, Paperclip, ChevronDown, Archive, Trash2,
  Megaphone, AlertTriangle, Clock, Award, Bell, RefreshCw, Zap,
} from "lucide-react";

const relativeTime = (d) => {
  if (!d) return "";
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const typeConf = {
  announcement:    { icon: Megaphone,      bg: "bg-gray-100",   icon_c: "text-gray-500",   label: "Announcement"    },
  update:          { icon: RefreshCw,      bg: "bg-blue-100",   icon_c: "text-blue-500",   label: "Update"          },
  deadline:        { icon: Clock,          bg: "bg-red-100",    icon_c: "text-red-500",    label: "Deadline"        },
  schedule_change: { icon: AlertTriangle,  bg: "bg-amber-100",  icon_c: "text-amber-500",  label: "Schedule Change" },
  result:          { icon: Award,          bg: "bg-green-100",  icon_c: "text-green-500",  label: "Result"          },
  reminder:        { icon: Bell,           bg: "bg-purple-100", icon_c: "text-purple-500", label: "Reminder"        },
};

const priorityConf = {
  urgent: { row: "bg-red-50 border-red-100",    icon_bg: "bg-red-500",    icon_c: "text-white", badge: "bg-red-500 text-white",    label: "Urgent" },
  high:   { row: "bg-amber-50 border-amber-100",icon_bg: "bg-amber-400",  icon_c: "text-white", badge: "bg-amber-400 text-white",  label: "High"   },
  normal: { row: "bg-white border-gray-100",    icon_bg: null,            icon_c: null,         badge: null,                       label: ""       },
  low:    { row: "bg-white border-gray-100",    icon_bg: null,            icon_c: null,         badge: null,                       label: ""       },
};

const NoticeCard = ({ notice, canManage, onPin, onArchive, onDelete }) => {
  const [open,     setOpen]     = useState(false);
  const [isPinned, setIsPinned] = useState(notice.isPinned);
  const [busy,     setBusy]     = useState(false);

  const tc = typeConf[notice.noticeType]   ?? typeConf.announcement;
  const pc = priorityConf[notice.priority] ?? priorityConf.normal;
  const Icon = tc.icon;

  const isAlert = notice.priority === "urgent" || notice.priority === "high";

  // Override icon background for high priority
  const iconBg  = isAlert ? pc.icon_bg  : tc.bg;
  const iconCol = isAlert ? pc.icon_c   : tc.icon_c;

  const act = async (fn) => {
    setBusy(true);
    try { await fn(); } catch {} finally { setBusy(false); }
  };

  return (
    <div className={`border rounded-xl transition-all duration-150 overflow-hidden
      ${pc.row}
      ${busy ? "opacity-40 pointer-events-none" : ""}
    `}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-start gap-3 px-3 py-3"
      >
        {/* Icon box */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={14} className={iconCol} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isPinned && <Pin size={9} className="text-gray-400 flex-shrink-0" />}
            {isAlert && (
              <span className={`text-[9px] font-bold px-1.5 py-px rounded-full flex-shrink-0 ${pc.badge}`}>
                {pc.label}
              </span>
            )}
            <span className="text-[10px] text-gray-400 font-medium">{tc.label}</span>
          </div>

          <p className="text-xs font-semibold text-gray-900 leading-snug truncate">
            {notice.title}
          </p>

          {!open && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {notice.content}
            </p>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 pt-0.5">
          <span className="text-[10px] text-gray-400">{relativeTime(notice.createdAt)}</span>
          <ChevronDown size={11} className={`text-gray-300 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Expanded */}
      {open && (
        <div className="px-3 pb-3 space-y-2.5 -mt-0.5">
          {/* Divider */}
          <div className="border-t border-black/5" />

          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
            {notice.content}
          </p>

          {/* Metadata */}
          {notice.metadata && Object.keys(notice.metadata).length > 0 && (
            <div className="bg-white/60 border border-black/5 rounded-lg px-3 py-2 space-y-1">
              {Object.entries(notice.metadata).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <span className="text-gray-400 capitalize min-w-[80px]">
                    {k.replace(/([A-Z])/g, " $1")}
                  </span>
                  <span className="text-gray-700 font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Attachments */}
          {notice.attachments?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {notice.attachments.map((f, i) => (
                <a
                  key={i}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-md hover:border-gray-400 transition-colors"
                >
                  <Paperclip size={8} /> {f.name}
                </a>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-gray-400">
              {notice.createdBy?.firstName} {notice.createdBy?.lastName}
            </span>

            {canManage && (
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); act(async () => { await onPin?.(notice._id); setIsPinned(p => !p); }); }}
                  className={`flex items-center gap-1 text-[10px] transition-colors ${isPinned ? "text-gray-800 font-semibold" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <Pin size={9} /> {isPinned ? "Pinned" : "Pin"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); act(() => onArchive?.(notice._id)); }}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Archive size={9} /> Archive
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); act(() => onDelete?.(notice._id)); }}
                  className="flex items-center gap-1 text-[10px] text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={9} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeCard;