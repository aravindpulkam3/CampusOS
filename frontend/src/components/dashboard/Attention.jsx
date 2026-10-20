import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PRIORITY_LABEL } from "../cards/NoticeCard";
import { Kicker, SectionHead, btnSm, feedTitle, focusRing, textLink } from "../common/ui";
import useIsClamped from "../../hooks/useIsClamped";
import { formatDateTime, formatTimeAgo } from "../../utils/formatDate";
import { closesInLabel } from "./format";

const sourceLabel = {
  classroom: "Classroom",
  club: "Club",
  event: "Event",
  drive: "Placement",
  platform: "Platform",
};

// The title links to where the notice came from, when it has a source page.
// The text opens in place, and only offers to when two lines cut it short.
const NoticeItem = ({ notice }) => {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const bodyRef = useRef(null);
  const clamped = useIsClamped(bodyRef, !open, notice.message);

  const priority = PRIORITY_LABEL[notice.priority];
  const source =
    notice.sourceName && notice.sourceName !== "CampusOS"
      ? notice.sourceName
      : sourceLabel[notice.sourceType] || "Platform";
  const tone = notice.priority === "urgent" ? "urgent" : notice.priority === "high" ? "warn" : "quiet";

  return (
    <li className="py-[18px] first:pt-1.5">
      <Kicker
        tone={tone}
        pinned={notice.isPinned}
        after={
          <>
            {", "}
            <time dateTime={notice.createdAt} title={formatDateTime(notice.createdAt)}>
              {formatTimeAgo(notice.createdAt)}
            </time>
          </>
        }
      >
        {priority ? `${priority}, ${source}` : source}
      </Kicker>
      <h3 className={feedTitle}>
        {notice.url ? (
          <Link
            to={notice.url}
            className={`rounded decoration-ink/25 underline-offset-[3px] hover:underline ${focusRing}`}
          >
            {notice.title}
          </Link>
        ) : (
          notice.title
        )}
      </h3>
      {notice.message && (
        <p
          id={bodyId}
          ref={bodyRef}
          className={`mt-1 break-words text-[13.5px] leading-normal text-ink-2 ${
            open ? "whitespace-pre-line" : "line-clamp-2"
          }`}
        >
          {notice.message}
        </p>
      )}
      {(clamped || open) && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className={`mt-1.5 rounded text-[13px] font-[550] text-ink-2 transition-colors hover:text-ink ${focusRing}`}
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </li>
  );
};

// An eligible drive or a followed club's event whose window closes today or
// tomorrow, and that the student has not acted on.
const ClosingItem = ({ item }) => (
  <li className="[&:first-child>a]:pt-1.5">
    <Link to={item.url} className={`group block rounded-lg py-[18px] ${focusRing}`}>
      <Kicker tone="warn">{closesInLabel(item.closesAt, item.urgency)}</Kicker>
      <h3 className={`${feedTitle} decoration-ink/25 underline-offset-[3px] group-hover:underline`}>
        {item.title}
      </h3>
      <p className="mt-3 flex items-center gap-3 text-[13.5px] text-ink-2">
        <span className="min-w-0 truncate">{item.subtitle}</span>
        {item.actionLabel && <span className={`ml-auto flex-none ${btnSm}`}>{item.actionLabel}</span>}
      </p>
    </Link>
  </li>
);

const SHOWN_MIN = 3;
const SHOWN_MAX = 5;

// One feed for everything that wants the student's eyes: urgent notices, then
// windows about to close, then important notices, then the rest in the order
// the server ranked them.
const Attention = ({ notices = [], closing = [] }) => {
  const [expanded, setExpanded] = useState(false);

  const urgent = notices.filter((n) => n.priority === "urgent");
  const important = notices.filter((n) => n.priority === "high");
  const routine = notices.filter((n) => n.priority !== "urgent" && n.priority !== "high");

  const items = [
    ...urgent.map((notice) => ({ key: `notice-${notice.id}`, notice })),
    ...closing.map((item) => ({ key: item.id, closing: item })),
    ...[...important, ...routine].map((notice) => ({ key: `notice-${notice.id}`, notice })),
  ];

  // Everything pressing shows without a click (up to SHOWN_MAX); a quiet day
  // still shows the latest few notices.
  const pressing = urgent.length + closing.length + important.length;
  const shownCount = Math.min(SHOWN_MAX, Math.max(SHOWN_MIN, pressing));
  const hidden = items.length - shownCount;
  const shown = expanded ? items : items.slice(0, shownCount);

  return (
    <section className="min-w-0">
      <SectionHead title={pressing > 0 ? "Needs your attention" : "Notices"} />
      {items.length > 0 ? (
        <ul className="divide-y divide-line">
          {shown.map(({ key, notice, closing: item }) =>
            notice ? <NoticeItem key={key} notice={notice} /> : <ClosingItem key={key} item={item} />,
          )}
        </ul>
      ) : (
        <p className="py-1.5 text-[14.5px] text-ink-2">Nothing needs your attention.</p>
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className={`mt-1 w-full border-t border-line pt-3.5 text-left ${textLink}`}
        >
          {expanded ? "Show fewer" : `Show ${hidden} more`}
        </button>
      )}
    </section>
  );
};

export default Attention;
