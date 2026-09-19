import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown } from "lucide-react";
import { Section, Empty } from "./Section";
import { RowList } from "./Row";
import { relativeTime } from "./format";

const sourceLabel = {
  classroom: "Classroom",
  club: "Club",
  event: "Event",
  drive: "Placement",
  platform: "Platform",
};

const priorityDot = {
  urgent: "bg-rose-500",
  high: "bg-amber-400",
  normal: "bg-gray-300",
  low: "bg-gray-200",
};

// Title links to the notice's source when there is one; the expand toggle is a
// separate control so both are reachable by keyboard.
const NoticeRow = ({ notice }) => {
  const [open, setOpen] = useState(false);
  const label = sourceLabel[notice.sourceType] || "Platform";
  const showSourceName =
    notice.sourceName && notice.sourceName !== label && notice.sourceName !== "CampusOS";

  const body = (
    <>
      <p
        className={`text-sm text-gray-900 truncate ${
          notice.isPinned || notice.priority === "urgent" ? "font-semibold" : "font-medium"
        }`}
      >
        {notice.title}
      </p>
      <p className="text-xs text-gray-500 truncate">
        <span className="font-medium text-gray-600">{label}</span>
        {showSourceName && <> · {notice.sourceName}</>}
        {" · "}
        {relativeTime(notice.createdAt)}
      </p>
    </>
  );

  return (
    <li>
      <div className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors">
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${
            priorityDot[notice.priority] || priorityDot.normal
          }`}
          aria-hidden
        />
        {notice.url ? (
          <Link
            to={notice.url}
            className="flex-1 min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            {body}
          </Link>
        ) : (
          <div className="flex-1 min-w-0">{body}</div>
        )}
        {notice.message && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Hide notice details" : "Show notice details"}
            className="p-1 -mr-1 rounded text-gray-300 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 flex-shrink-0"
          >
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {open && (
        <p className="mx-4 mb-2.5 ml-8 text-xs text-gray-600 leading-relaxed whitespace-pre-line">
          {notice.message}
        </p>
      )}
    </li>
  );
};

const RelevantNotices = ({ notices = [] }) => (
  <Section title="Relevant Notices" icon={Bell} variant="primary">
    {notices.length > 0 ? (
      <RowList>
        {notices.map((notice) => (
          <NoticeRow key={notice.id} notice={notice} />
        ))}
      </RowList>
    ) : (
      <Empty message="Nothing new for you." />
    )}
  </Section>
);

export default RelevantNotices;
