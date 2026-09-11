import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown } from "lucide-react";
import { Section, Empty } from "./Section";
import { relativeTime } from "./format";

// The backend labels every notice with where it came from, so the student can
// see at a glance why it reached them.
const sourceChip = {
  classroom: { label: "Classroom", className: "text-blue-700 bg-blue-50" },
  club: { label: "Club", className: "text-purple-700 bg-purple-50" },
  event: { label: "Event", className: "text-violet-700 bg-violet-50" },
  drive: { label: "Placement", className: "text-emerald-700 bg-emerald-50" },
  platform: { label: "Platform", className: "text-gray-600 bg-gray-100" },
};

const priorityDot = {
  urgent: "bg-rose-500",
  high: "bg-amber-500",
  normal: "bg-gray-400",
  low: "bg-gray-300",
};

const NoticeRow = ({ notice }) => {
  const [open, setOpen] = useState(false);
  const chip = sourceChip[notice.sourceType] || sourceChip.platform;

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-2.5 py-2.5 text-left group"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
            priorityDot[notice.priority] || priorityDot.normal
          }`}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs text-gray-800 break-words group-hover:text-gray-900 ${
              notice.isPinned || notice.priority === "urgent"
                ? "font-semibold"
                : "font-medium"
            }`}
          >
            {notice.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${chip.className}`}
            >
              {chip.label}
            </span>
            <span className="text-[10px] text-gray-400 truncate">
              {notice.sourceName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
          <span className="text-[10px] text-gray-400">
            {relativeTime(notice.createdAt)}
          </span>
          <ChevronDown
            size={11}
            className={`text-gray-300 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="ml-4 pb-3 space-y-2">
          {notice.message && (
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50/60 p-2.5 rounded-lg">
              {notice.message}
            </p>
          )}
          {notice.url && (
            <Link
              to={notice.url}
              className="inline-block text-[10px] font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              Go to {notice.sourceName} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

const RelevantNotices = ({ notices = [] }) => (
  <Section title="Relevant Notices" icon={Bell}>
    {notices.length > 0 ? (
      <div>
        {notices.map((notice) => (
          <NoticeRow key={notice.id} notice={notice} />
        ))}
      </div>
    ) : (
      <Empty message="Nothing new for you." />
    )}
  </Section>
);

export default RelevantNotices;
