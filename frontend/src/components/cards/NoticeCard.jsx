import { useEffect, useId, useRef, useState } from "react";
import {
  Archive,
  CircleAlert,
  MoreHorizontal,
  Pin,
  Trash2,
} from "lucide-react";
import { formatDate, formatDateTime, formatShortDate, formatTimeAgo } from "../../utils/formatDate";
import useIsClamped from "../../hooks/useIsClamped";
import { Kicker, feedTitle, focusRing } from "../common/ui";

// Only urgent and high are called out in words; normal and low carry no label.
export const PRIORITY_LABEL = { urgent: "Urgent", high: "Important" };

// Club / event / company a notice belongs to, when the server populated it.
const sourceName = ({ targetType, targetId }) => {
  if (!targetId || typeof targetId !== "object") return "";
  if (targetType === "clubs") return targetId.clubName || "";
  if (targetType === "events") return targetId.eventName || "";
  if (targetType === "drive" || targetType === "drives") return targetId.companyName || "";
  return "";
};

// "16 Oct" this year, "16 Oct 2027" otherwise.
const expiryDate = (d) =>
  new Date(d).getFullYear() === new Date().getFullYear() ? formatShortDate(d) : formatDate(d);

const menuItem = `flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13.5px] hover:bg-soft focus-visible:bg-soft focus-visible:outline-none`;

// Pin / Archive / Delete. A sibling of the notice's text, never inside a
// control, so using the menu can't also open the notice.
const NoticeMenu = ({ isPinned, busy, onPin, onArchive, onDelete }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector("button")?.focus();
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = [...menuRef.current.querySelectorAll("button")];
      const next = items.indexOf(document.activeElement) + (e.key === "ArrowDown" ? 1 : -1);
      items[(next + items.length) % items.length]?.focus();
    }
  };

  const pick = (fn) => () => {
    close();
    fn();
  };

  return (
    <div ref={wrapRef} className="relative -mr-1.5 -mt-1.5 shrink-0" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Notice actions"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className={`grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-40 ${focusRing} ${
          open ? "bg-soft text-ink" : "text-ink-3 hover:bg-soft hover:text-ink"
        }`}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-line-2 bg-white p-1 shadow-panel"
        >
          <button type="button" role="menuitem" onClick={pick(onPin)} className={`${menuItem} text-ink`}>
            <Pin size={14} className="text-ink-3" aria-hidden="true" />
            {isPinned ? "Unpin" : "Pin"}
          </button>
          <button type="button" role="menuitem" onClick={pick(onArchive)} className={`${menuItem} text-ink`}>
            <Archive size={14} className="text-ink-3" aria-hidden="true" />
            Archive
          </button>
          <div className="my-1 border-t border-line" />
          <button type="button" role="menuitem" onClick={pick(onDelete)} className={`${menuItem} text-urgent`}>
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

// One notice: what kind it is and when, the title, then the text. The text
// opens in place, and only offers to when two lines cut it short.
// `showSource` names the club, event or company it belongs to, for feeds that
// mix several.
const NoticeCard = ({ notice, canManage, showSource = false, onPin, onArchive, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(notice.isPinned);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bodyId = useId();
  const bodyRef = useRef(null);
  const clamped = useIsClamped(bodyRef, !open, notice.content);

  const author = notice.createdBy?.firstName
    ? `${notice.createdBy.firstName} ${notice.createdBy.lastName ?? ""}`.trim()
    : "";
  const lead =
    [PRIORITY_LABEL[notice.priority], showSource && sourceName(notice), author]
      .filter(Boolean)
      .join(", ") ||
    "Notice";
  const kind = notice.priority === "urgent" ? "urgent" : notice.priority === "high" ? "warn" : "quiet";

  // State only changes once the request has succeeded; a failure leaves the
  // notice as it was and says so.
  const act = async (fn, failed) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch {
      setError(failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`py-[18px] first:pt-1.5 ${busy ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Kicker
            tone={kind}
            pinned={isPinned}
            after={
              <>
                {", "}
                <time dateTime={notice.createdAt} title={formatDateTime(notice.createdAt)}>
                  {formatTimeAgo(notice.createdAt)}
                </time>
                {notice.expiresAt && `, until ${expiryDate(notice.expiresAt)}`}
              </>
            }
          >
            {lead}
          </Kicker>
          <h3 className={feedTitle}>{notice.title}</h3>
          {notice.content && (
            <p
              id={bodyId}
              ref={bodyRef}
              className={`mt-1 break-words text-[13.5px] leading-normal text-ink-2 ${
                open ? "whitespace-pre-line" : "line-clamp-2"
              }`}
            >
              {notice.content}
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
        </div>

        {canManage && (
          <NoticeMenu
            isPinned={isPinned}
            busy={busy}
            onPin={() =>
              act(async () => {
                await onPin?.(notice._id);
                setIsPinned((p) => !p);
              }, "Couldn't update the pin. Try again.")
            }
            onArchive={() => act(() => onArchive?.(notice._id), "Couldn't archive this notice. Try again.")}
            onDelete={() => act(() => onDelete?.(notice._id), "Couldn't delete this notice. Try again.")}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-[13px] text-urgent">
          <CircleAlert size={13} className="shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </li>
  );
};

export default NoticeCard;
