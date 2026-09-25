import { Link } from "react-router-dom";

// Small structural pieces shared by detail pages. Deliberately neutral: the
// defaults are plain slate, and every colour can be overridden by the caller,
// so a page with its own accent (e.g. EventDetail) is never boxed in.

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15";

export const SectionHeader = ({
  id,
  icon: Icon,
  title,
  count,
  className = "mb-3 px-1",
  iconClassName = "text-slate-400",
  titleClassName = "text-sm font-semibold text-slate-800",
}) => (
  <div className={`flex items-center gap-2 ${className}`}>
    {Icon && <Icon size={15} className={iconClassName} aria-hidden="true" />}
    <h2 id={id} className={titleClassName}>
      {title}
    </h2>
    {count > 0 && (
      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
        {count}
      </span>
    )}
  </div>
);

// A quiet toolbar link for manage actions. `className` replaces the colour
// treatment, `iconClassName` the icon colour, `focusClassName` the focus ring
// (replace rather than stack: two ring colours would fight).
export const ManageLink = ({
  to,
  state,
  icon: Icon,
  children,
  className = "text-slate-600 border-transparent hover:bg-white hover:border-slate-200 hover:text-slate-900",
  iconClassName = "text-slate-400",
  focusClassName = focusRing,
}) => (
  <Link
    to={to}
    state={state}
    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${focusClassName} ${className}`}
  >
    <Icon size={12} className={iconClassName} aria-hidden="true" />
    {children}
  </Link>
);
