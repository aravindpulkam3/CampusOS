import { focusRing } from "../../components/common/SectionBits";

// Small presentational pieces shared by the two Discussion pages (list and
// detail), which used to duplicate them. Page-specific markup stays in the pages.

export const CATEGORY = {
  general: { label: "General", chip: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  coding: { label: "Coding", chip: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
  projects: { label: "Projects", chip: "bg-teal-50 text-teal-700 border-teal-100", dot: "bg-teal-500" },
  higher_studies: { label: "Higher Studies", chip: "bg-violet-50 text-violet-700 border-violet-100", dot: "bg-violet-500" },
  research: { label: "Research", chip: "bg-orange-50 text-orange-700 border-orange-100", dot: "bg-orange-500" },
  study_tips: { label: "Study Tips", chip: "bg-rose-50 text-rose-700 border-rose-100", dot: "bg-rose-500" },
};

// Class recipes (EventSphere look: slate, hairline borders, rounded-2xl cards).
export const card =
  "bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
export const chip =
  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap";
export const btnPrimary = `inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${focusRing}`;
export const btnSecondary = `inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 enabled:hover:border-slate-400 enabled:hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${focusRing}`;
// Quiet in-row actions (Reply, Accept, Show replies…). `ghostBase` has no
// colours, so variants add their own instead of stacking conflicting ones.
export const ghostBase = `inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap disabled:opacity-60 transition-colors ${focusRing}`;
export const ghostAction = `${ghostBase} text-slate-500 hover:bg-slate-100 hover:text-slate-800`;

export const CategoryChip = ({ category, dot = false }) => {
  const meta = CATEGORY[category] ?? CATEGORY.general;
  return (
    <span className={`${chip} ${meta.chip}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />}
      {CATEGORY[category] ? meta.label : category}
    </span>
  );
};

const avatarSize = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-7 h-7 text-[10px]",
  md: "w-10 h-10 text-xs",
};

export const Avatar = ({ user, size = "sm" }) => (
  <span
    className={`${avatarSize[size]} rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200/70 font-bold flex items-center justify-center flex-shrink-0 select-none`}
    aria-hidden="true"
  >
    {`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase()}
  </span>
);

export const relativeTime = (d) => {
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
};

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
