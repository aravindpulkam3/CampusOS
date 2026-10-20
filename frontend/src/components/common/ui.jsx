import { Fragment, useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, Loader2, Pin, Search, X } from "lucide-react";
import useImageOk from "../../hooks/useImageOk";
import useDocumentTitle from "../../hooks/useDocumentTitle";

// Building blocks of the converted (light) screens: titles, section headings,
// list rows, the small tiles that lead a row, filters and the button recipes.
// Each mirrors a class in design-preview/redesign/round2/light.css.

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25";

// Buttons. Each recipe is complete: pick one, add layout classes (w-full, mt-4).
const btnBase = `inline-flex items-center justify-center gap-2 font-[550] whitespace-nowrap transition-colors disabled:cursor-wait disabled:opacity-60 ${focusRing} focus-visible:ring-offset-2`;
const solid = "bg-ink text-white hover:bg-ink/85";
const ghost = "border border-line-2 bg-white text-ink hover:border-ink-3";
const sizeMd = "h-[38px] px-[17px] rounded-[11px] text-sm";
const sizeSm = "h-8 px-[13px] rounded-[9px] text-[13px]";
const sizeLg = "h-[46px] px-[22px] rounded-[13px] text-[15px]";
export const btn = `${btnBase} ${solid} ${sizeMd}`;
export const btnSm = `${btnBase} ${solid} ${sizeSm}`;
export const btnLg = `${btnBase} ${solid} ${sizeLg}`;
export const btnGhost = `${btnBase} ${ghost} ${sizeMd}`;
export const btnGhostSm = `${btnBase} ${ghost} ${sizeSm}`;
// For actions that cannot be undone (cancel a drive, delete a round).
export const btnDangerSm = `${btnBase} border border-line-2 bg-white text-urgent hover:border-urgent/50 ${sizeSm}`;

// A quiet text link or text button ("Show more", "All events").
export const textLink = `rounded text-[13.5px] text-ink-3 transition-colors hover:text-ink ${focusRing}`;

// The raised white surface (day strip, facts, side cards).
export const panel = "rounded-panel border border-line-2 bg-white/[0.78] shadow-panel";

// Colour is kept for meaning: happening or confirmed, closing soon, urgent.
export const tone = {
  live: "text-live font-[550]",
  warn: "text-warn font-[550]",
  urgent: "text-urgent font-[550]",
};

// Body copy and one-line notes (empty lists, load failures).
export const note = "py-1.5 text-[14.5px] text-ink-2";

// ─── Page and section headings ────────────────────────────────

// The page's h1, an optional line above it (a breadcrumb, a date), a line
// below it and, on the right, the page's own actions. `lead` is a mark that
// sits before the title (a club's logo); `large` is for detail pages, where
// the title is the name of the thing itself.
export const PageTitle = ({ title, crumb, sub, lead, large = false, children }) => {
  useDocumentTitle(typeof title === "string" ? title : null);
  return (
  <header className="flex flex-col gap-4 pt-1 lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:pt-4">
    <div className="flex min-w-0 items-center gap-4">
      {lead}
      <div className="min-w-0">
        {crumb && <p className="mb-1 text-[14.5px] text-ink-3">{crumb}</p>}
        <h1
          className={`break-words font-[680] text-ink ${
            large
              ? "text-[32px] leading-[1.1] tracking-[-0.045em] lg:text-[44px] lg:leading-[1.08] lg:tracking-[-0.048em]"
              : "text-[29px] leading-[1.12] tracking-[-0.042em] lg:text-4xl lg:leading-[1.12]"
          }`}
        >
          {title}
        </h1>
        {sub && <p className="mt-2 text-[15.5px] tracking-[-0.015em] text-ink-2">{sub}</p>}
      </div>
    </div>
    {children && <div className="flex flex-none flex-wrap items-center gap-2">{children}</div>}
  </header>
  );
};

// A link in a page's breadcrumb line.
export const crumbLink = `rounded transition-colors hover:text-ink ${focusRing}`;

// `aside` is plain text on the right ("Latest 3 of 12"); a link wins over it.
export const SectionHead = ({ id, title, linkTo, linkLabel, aside, headingRef }) => (
  <div className="mb-2.5 flex items-baseline gap-4">
    <h2
      id={id}
      ref={headingRef}
      tabIndex={headingRef ? -1 : undefined}
      className="text-[17px] font-[650] tracking-[-0.025em] text-ink outline-none"
    >
      {title}
    </h2>
    {linkTo ? (
      <Link to={linkTo} className={`ml-auto ${textLink}`}>
        {linkLabel}
      </Link>
    ) : (
      aside && <span className="ml-auto text-[13.5px] text-ink-3">{aside}</span>
    )}
  </div>
);

// ─── Rows ─────────────────────────────────────────────────────

export const Rows = ({ children }) => <ul className="divide-y divide-line">{children}</ul>;

// One list row: an optional leading tile, a title over one line of detail, and
// an optional trailing label (`endTone` colours it) or control. The whole row
// is the link when `to` is given; `muted` is for rows about the past.
export const Row = ({ to, lead, title, meta, end, endTone, muted = false }) => {
  const layout = "flex min-h-16 items-center gap-4 py-3";
  const body = (
    <>
      {lead}
      <div className="min-w-0 flex-1">
        <h3
          className={`truncate text-[15px] font-semibold leading-[1.35] tracking-[-0.018em] ${
            muted ? "text-ink-2" : "text-ink"
          } ${to ? "decoration-ink/25 underline-offset-[3px] group-hover:underline" : ""}`}
        >
          {title}
        </h3>
        {/* Phones give the detail a second line instead of cutting it short */}
        {meta && <p className="mt-px text-[13.5px] text-ink-2 max-sm:line-clamp-2 sm:truncate">{meta}</p>}
      </div>
      {end && (
        <span
          className={`flex-none whitespace-nowrap text-right text-[13.5px] ${tone[endTone] || "text-ink-2"}`}
        >
          {end}
        </span>
      )}
    </>
  );

  return (
    <li>
      {to ? (
        <Link to={to} className={`group rounded-lg ${layout} ${focusRing}`}>
          {body}
        </Link>
      ) : (
        <div className={layout}>{body}</div>
      )}
    </li>
  );
};

// Day of the month over a short weekday, for rows that are about a date.
// Decorative: the row's own text says when.
export const DateTile = ({ date, large = false }) => {
  const d = new Date(date);
  return (
    <span
      aria-hidden="true"
      className={`grid flex-none content-center justify-items-center rounded-[11px] bg-soft leading-[1.05] ${
        large ? "size-11" : "size-10"
      }`}
    >
      <b className="text-[15px] font-[680] tracking-[-0.02em] text-ink">{d.getDate()}</b>
      <span className="text-[10.5px] font-medium text-ink-2">
        {d.toLocaleDateString("en-IN", { weekday: "short" })}
      </span>
    </span>
  );
};

// A company, club or person's mark: the stored picture when it loads,
// otherwise an initial. `cover` crops a photo to fill; logos are shown whole.
const logoSize = {
  sm: "size-7 rounded-lg text-xs",
  md: "size-10 rounded-[11px] text-sm",
  lg: "size-[60px] rounded-2xl text-[22px]",
};
export const LogoTile = ({ src, name, size = "md", cover = false }) => {
  const [showLogo, onLogoError] = useImageOk(src);
  return (
    <span
      aria-hidden="true"
      className={`grid flex-none place-items-center overflow-hidden bg-soft font-[650] text-ink ring-1 ring-inset ring-line-2 ${logoSize[size]}`}
    >
      {showLogo ? (
        <img
          src={src}
          alt=""
          onError={onLogoError}
          className={`size-full ${cover ? "object-cover" : "object-contain p-1"}`}
        />
      ) : (
        name?.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
};

// ─── Feed items (notices, announcements, the dashboard feed) ──

const kickerTone = {
  urgent: { text: "text-urgent", dot: "bg-urgent ring-[3px] ring-urgent/15" },
  warn: { text: "text-warn", dot: "bg-warn" },
  quiet: { text: "text-ink-3", dot: "bg-line-2" },
};

// The small line above a feed item: a dot (a pin on pinned items), what kind
// of item it is, and when. `children` truncates, `after` never does.
export const Kicker = ({ tone: kind = "quiet", pinned = false, after, children }) => (
  <p className={`mb-1.5 flex items-center gap-2 text-[13px] font-[550] ${kickerTone[kind].text}`}>
    {pinned ? (
      <Pin size={11} className="flex-none fill-current" aria-hidden="true" />
    ) : (
      <span aria-hidden="true" className={`size-1.5 flex-none rounded-full ${kickerTone[kind].dot}`} />
    )}
    <span className="flex min-w-0">
      {pinned && <span className="sr-only">Pinned. </span>}
      <span className="min-w-0 truncate">{children}</span>
      {after && <span className="flex-none whitespace-pre">{after}</span>}
    </span>
  </p>
);

export const feedTitle =
  "text-[15px] font-semibold leading-[1.35] tracking-[-0.018em] text-ink break-words";

// ─── Filters ──────────────────────────────────────────────────

// A row of single-choice filter chips; scrolls sideways when it runs out of room.
// Two groups side by side share one scrolling row instead: wrap them in it and
// pass `className="flex-none"` so neither shrinks.
export const Chips = ({ label, options, value, onChange, className = "" }) => (
  <div
    role="group"
    aria-label={label}
    className={`no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 ${className}`}
  >
    {options.map((option) => {
      const { value: key, label: text } = typeof option === "string" ? { value: option, label: option } : option;
      const on = key === value;
      return (
        <button
          key={key}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(key)}
          className={`h-[34px] flex-none whitespace-nowrap rounded-full px-[13px] text-[14.5px] font-medium transition-colors ${focusRing} ${
            on
              ? "bg-ink text-white"
              : "border border-line-2 bg-white text-ink-2 hover:border-ink-3 hover:text-ink"
          }`}
        >
          {text}
        </button>
      );
    })}
  </div>
);

export const SearchField = ({ value, onChange, placeholder, label, className = "lg:w-60" }) => (
  <div
    className={`flex h-9 w-full flex-none items-center gap-2 rounded-[10px] border border-line-2 bg-white px-3 transition-colors focus-within:border-ink-3 focus-within:ring-2 focus-within:ring-ink/10 ${className}`}
  >
    <Search size={15} className="flex-none text-ink-3" aria-hidden="true" />
    <input
      type="text"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-0 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-3"
    />
    {value && (
      <button
        type="button"
        aria-label={`Clear: ${label}`}
        onClick={() => onChange("")}
        className={`-m-1.5 flex-none rounded p-1.5 text-ink-3 transition-colors hover:text-ink ${focusRing}`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    )}
  </div>
);

// ─── List states ──────────────────────────────────────────────

export const LoadMore = ({ onClick, loading, failed = false, children = "Load more" }) => (
  <button type="button" onClick={onClick} disabled={loading} className={`mt-6 w-full ${btnGhost}`}>
    {loading ? (
      <>
        <Loader2 size={14} className="animate-spin text-ink-3" aria-hidden="true" /> Loading…
      </>
    ) : failed ? (
      "Try again"
    ) : (
      children
    )}
  </button>
);

// A load failure with a way to retry, sized for a section.
export const LoadError = ({ children, onRetry }) => (
  <p role="alert" className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${note}`}>
    {children}
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className={`rounded font-[550] text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-ink ${focusRing}`}
      >
        Try again
      </button>
    )}
  </p>
);

// A whole page that could not be shown: not found, or failed to load.
export const PageMessage = ({ title, children, action }) => (
  <div className="mx-auto max-w-md px-4 py-24 text-center">
    <h1 className="text-[17px] font-[650] tracking-[-0.025em] text-ink">{title}</h1>
    <p className="mt-1.5 text-[14.5px] text-ink-2">{children}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

// ─── Status ───────────────────────────────────────────────────

const pillTone = {
  neutral: "bg-soft text-ink-2",
  good: "bg-[#e8f6ee] text-[#0b7a3e]",
  wait: "bg-[#fff3dc] text-[#8a5300]",
  bad: "bg-[#fdecec] text-[#b4282d]",
};

// A small status label with a dot: where an application or a round stands.
export const Pill = ({ tone: kind = "neutral", children }) => (
  <span
    className={`inline-flex h-[26px] flex-none items-center gap-[7px] whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-[550] ${pillTone[kind]}`}
  >
    <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
    {children}
  </span>
);

// A small quiet label beside a title or a name: Pinned, Locked, Author, Admin.
export const Tag = ({ children }) => (
  <span className="inline-flex h-5 flex-none items-center rounded-full bg-soft px-2 text-xs font-[550] text-ink-2">
    {children}
  </span>
);

// A panel of labelled facts (an event's date and venue, a drive's pay, a
// profile's CGPA): two by two on phones, one row from lg up. `facts` is
// [{ label, value, detail, lead }]; falsy entries are skipped. A value given as
// an array of parts (a date, its time) only ever wraps between the parts. A
// `lead` fact comes first, in large type, across the full width on phones;
// an odd one out at the end also takes the full width on phones.
export const Facts = ({ facts, className = "" }) => {
  const shown = facts.filter(Boolean);
  const hasLead = !!shown[0]?.lead;
  return (
    <dl className={`grid grid-cols-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none ${panel} ${className}`}>
      {shown.map((fact, i) => {
        // Position in the two-column grid on phones, after a full-width lead.
        const k = hasLead ? i - 1 : i;
        const lastAlone = k >= 0 && i === shown.length - 1 && k % 2 === 0;
        return (
          <div
            key={fact.label}
            className={`min-w-0 border-line px-[18px] py-4 lg:px-6 lg:pb-6 lg:pt-[22px] ${
              k >= 0 && k % 2 ? "max-lg:border-l" : ""
            } ${i > (hasLead ? 0 : 1) ? "max-lg:border-t" : ""} ${i > 0 ? "lg:border-l" : ""} ${
              fact.lead || lastAlone ? "max-lg:col-span-2" : ""
            }`}
          >
            <dt className="text-[13px] text-ink-3">{fact.label}</dt>
            <dd
              className={`break-words text-ink ${
                fact.lead
                  ? "mt-1.5 text-[26px] font-bold leading-[1.1] tracking-[-0.045em] lg:mt-2 lg:text-[30px]"
                  : `mt-1.5 text-base font-[620] leading-snug tracking-[-0.02em] ${hasLead ? "lg:mt-[18px]" : "lg:mt-3.5"}`
              }`}
            >
              {Array.isArray(fact.value)
                ? fact.value.map((part, j) => (
                    <Fragment key={part}>
                      {j > 0 && " "}
                      <span className="inline-block whitespace-nowrap">
                        {part}
                        {j < fact.value.length - 1 && ","}
                      </span>
                    </Fragment>
                  ))
                : fact.value}
            </dd>
            {fact.detail && <dd className="mt-0.5 text-[13px] text-ink-2">{fact.detail}</dd>}
          </div>
        );
      })}
    </dl>
  );
};

// A one-line message about something that went wrong (`error`) or right.
export const Alert = ({ kind = "error", children }) => (
  <p
    role={kind === "error" ? "alert" : "status"}
    className={`flex items-start gap-2 text-[13.5px] ${kind === "error" ? "text-urgent" : tone.live}`}
  >
    {kind === "error" && <CircleAlert size={15} className="mt-0.5 flex-none" aria-hidden="true" />}
    <span className="min-w-0">{children}</span>
  </p>
);

// ─── Tabs, switches, forms ────────────────────────────────────

// Tabs that swap content inside a page (the app's sections use SectionTabs,
// which are links). `tabs` is [{ key, label, count }].
// Keyboard: Tab reaches the chosen tab only; the arrow keys, Home and End move
// between tabs and choose as they go, as the ARIA tabs pattern expects.
export const Tabs = ({ label, tabs, value, onChange }) => {
  const onKeyDown = (e) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const at = tabs.findIndex((t) => t.key === value);
    const step = keys[e.key];
    const next =
      step === "first" ? 0 : step === "last" ? tabs.length - 1 : (at + step + tabs.length) % tabs.length;
    onChange(tabs[next].key);
    e.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus();
  };
  return (
  <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="no-scrollbar flex gap-6 overflow-x-auto border-b border-line">
    {tabs.map((tab) => {
      const on = tab.key === value;
      return (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={on}
          tabIndex={on ? 0 : -1}
          onClick={() => onChange(tab.key)}
          className={`-mb-px flex-none whitespace-nowrap border-b-2 pb-[11px] pt-1 text-[14.5px] transition-colors ${focusRing} ${
            on ? "border-ink font-semibold text-ink" : "border-transparent font-medium text-ink-2 hover:text-ink"
          }`}
        >
          {tab.label}
          {tab.count > 0 && <span className="ml-1.5 font-medium text-ink-3">{tab.count}</span>}
        </button>
      );
    })}
  </div>
  );
};

// An on/off filter with its label ("Eligible for me").
export const Switch = ({ checked, onChange, children }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`inline-flex flex-none items-center gap-[9px] rounded-full text-[14.5px] font-medium text-ink-2 transition-colors hover:text-ink ${focusRing} focus-visible:ring-offset-2`}
  >
    <span
      aria-hidden="true"
      className={`relative h-5 w-[34px] flex-none rounded-full transition-colors ${checked ? "bg-ink" : "bg-line-2"}`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white transition-[left] ${checked ? "left-4" : "left-0.5"}`}
      />
    </span>
    {children}
  </button>
);

// Form fields: a label above an input, textarea or select.
export const fieldLabel = "mb-[7px] block text-[13.5px] font-[550] text-ink";
const fieldBase =
  "w-full min-h-[42px] rounded-[11px] border bg-white px-[13px] text-[14.5px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:ring-2";
export const fieldInput = `${fieldBase} border-line-2 focus:border-ink-3 focus:ring-ink/10`;
// The same field when its value was refused ("Enter a full web address").
export const fieldInputError = `${fieldBase} border-urgent/70 focus:border-urgent focus:ring-urgent/15`;

// ─── Dialog ───────────────────────────────────────────────────

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// A modal dialog over the page. Escape and the close button dismiss it. Focus
// moves into it when it opens (to `initialFocusRef`, or the dialog itself),
// Tab and Shift+Tab wrap around inside it, and on closing focus goes back to
// whatever opened it. If that opener is gone by then (an empty-state button
// that no longer renders), `returnFocusRef` takes it instead.
export const Modal = ({ title, onClose, children, wide = false, initialFocusRef, returnFocusRef }) => {
  const titleId = useId();
  const boxRef = useRef(null);
  const openerRef = useRef(document.activeElement);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const box = boxRef.current;
    (initialFocusRef?.current ?? box)?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") return onCloseRef.current();
      if (e.key !== "Tab" || !box) return;
      const items = [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = box.contains(active);
      if (e.shiftKey && (!inside || active === first || active === box)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const opener = openerRef.current;
      (opener?.isConnected ? opener : returnFocusRef?.current)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/25 p-4 sm:items-center">
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`my-8 w-full rounded-panel border border-line-2 bg-white shadow-panel outline-none ${
          wide ? "max-w-xl" : "max-w-sm"
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 id={titleId} className="text-[17px] font-[650] tracking-[-0.025em] text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`-mr-2 grid size-8 flex-none place-items-center rounded-lg text-ink-3 transition-colors hover:bg-soft hover:text-ink ${focusRing}`}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// ─── Tables and pages of results ──────────────────────────────

// Header and body cells of a plain data table (applicants, the roster). Wrap
// the table in `overflow-x-auto` so a narrow screen pans it.
export const tableHead =
  "whitespace-nowrap border-b border-line-2 pb-3 pr-4 text-left text-[13px] font-medium text-ink-3";
export const tableCell = "whitespace-nowrap border-b border-line py-3.5 pr-4";

// Page numbers to show: first, last, and the current page's neighbours.
const pageWindow = (page, pages) => {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) out.push(p);
    else if (out[out.length - 1] !== "…") out.push("…");
  }
  return out;
};

const pageButton = `grid h-[34px] min-w-[34px] place-items-center rounded-[9px] px-2.5 font-medium transition-colors ${focusRing}`;
const pageButtonOff = "border border-line-2 bg-white text-ink-2 hover:border-ink-3";

// Numbered pages under a long list. `children` is the line on the left
// ("Showing 1 to 8 of 31 discussions").
export const PageNumbers = ({ page, pages, onPage, children }) => (
  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13.5px] text-ink-3">
    <span>{children}</span>
    {pages > 1 && (
      <nav aria-label="Pages" className="flex flex-wrap items-center gap-1.5">
        {page > 1 && (
          <button type="button" onClick={() => onPage(page - 1)} className={`${pageButton} ${pageButtonOff}`}>
            Previous
          </button>
        )}
        {pageWindow(page, pages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} aria-hidden="true" className="px-0.5">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              aria-label={`Go to page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`${pageButton} ${p === page ? "bg-ink text-white" : pageButtonOff}`}
            >
              {p}
            </button>
          ),
        )}
        {page < pages && (
          <button type="button" onClick={() => onPage(page + 1)} className={`${pageButton} ${pageButtonOff}`}>
            Next
          </button>
        )}
      </nav>
    )}
  </div>
);

// Previous / next for a paged list or table.
export const Pager = ({ page, pages, onPage, children }) => (
  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13.5px] text-ink-3">
    <span>{children}</span>
    {pages > 1 && (
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${btnGhostSm} disabled:cursor-default`}>
          Previous
        </button>
        <span className="px-1 text-ink-2">
          Page {page} of {pages}
        </span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className={`${btnGhostSm} disabled:cursor-default`}>
          Next
        </button>
      </div>
    )}
  </div>
);
