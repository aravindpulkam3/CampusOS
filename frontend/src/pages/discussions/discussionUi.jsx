import { focusRing } from "../../components/common/ui";
import { formatDateTime, formatTimeAgo } from "../../utils/formatDate";

// Small presentational pieces shared by the Discussion pages (the list, the
// thread and its replies). Page-specific markup stays in the pages.

export const CATEGORY = {
  general: "General",
  coding: "Coding",
  projects: "Projects",
  higher_studies: "Higher Studies",
  research: "Research",
  study_tips: "Study Tips",
};
export const categoryLabel = (category) => CATEGORY[category] ?? category;

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// The small quiet label (Pinned, Locked, Author, Admin) is shared with other pages.
export { Tag } from "../../components/common/ui";

// A person's initials on a tint taken from their name, so the same person
// reads as the same face all the way down a thread.
export const Face = ({ user }) => {
  const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`;
  const hue = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
  return (
    <span
      aria-hidden="true"
      className="grid size-[30px] flex-none select-none place-items-center rounded-full text-[11.5px] font-[650]"
      style={{ backgroundColor: `hsl(${hue} 48% 90%)`, color: `hsl(${hue} 42% 28%)` }}
    >
      {`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase()}
    </span>
  );
};

// Who wrote something and when. `children` sit right after the name (Author,
// Admin, "@Name"), `after` follows the time (views, "edited").
export const Byline = ({ user, date, children, after }) => (
  <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
    <Face user={user} />
    <b className="font-semibold text-ink">
      {user?.firstName} {user?.lastName}
    </b>
    {children}
    <time dateTime={date} title={formatDateTime(date)} className="text-ink-3">
      {formatTimeAgo(date)}
    </time>
    {after}
  </p>
);

// Text actions under a post (Reply, 2 replies, Accept). Each recipe carries
// its own colour and weight, so pick one rather than stacking two.
const actBase = `inline-flex items-center gap-1.5 whitespace-nowrap rounded text-[13px] transition-colors disabled:opacity-60 ${focusRing}`;
export const act = `${actBase} font-medium text-ink-2 hover:text-ink`;
export const actOn = `${actBase} font-semibold text-ink`;
export const actDanger = `${actBase} font-medium text-ink-2 hover:text-urgent`;

// Body text of a post or a reply. A blank line starts a new paragraph; single
// line breaks are kept as typed. `className` sets the size and measure.
export const Prose = ({ text, className = "" }) => (
  <div className={`space-y-3.5 break-words text-ink/90 ${className}`}>
    {String(text ?? "")
      .split(/\n\s*\n/)
      .map((paragraph, i) => (
        <p key={i} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
  </div>
);
