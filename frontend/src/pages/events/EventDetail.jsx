import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Lock,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  Sparkles,
  Timer,
  UserCheck,
  Users,
} from "lucide-react";
import {
  getEventById,
  registerForEvent,
  unregisterFromEvent,
} from "../../api/event.api";
import {
  getAnnouncements,
  deleteAnnouncement,
} from "../../api/announcement.api";
import useAuth from "../../hooks/useAuth";
import useIsClamped from "../../hooks/useIsClamped";
import useImageOk from "../../hooks/useImageOk";
import { focusRing, SectionHeader, ManageLink } from "../../components/common/SectionBits";
import NoticeFeed from "../../components/cards/NoticeFeed";
import AnnouncementCard from "../announcements/AnnouncementCard";

// ─── Event accent ─────────────────────────────────────────────
// Each category's accent, written out as complete class strings: Tailwind only
// generates classes it can find verbatim, so never build these from parts.
// The CTA sits on the dark banner; its white label is >= 4.5:1 on every fill.
// The About surface stays a whisper of the hue (-50 at <= 40%).
const categoryAccent = {
  Technical: {
    chip: "bg-blue-600 text-white",
    cta: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-black/30",
    ring: "focus-visible:ring-blue-300",
    fallback: "bg-blue-700",
    line: "bg-blue-600",
    progress: "bg-blue-400",
    dot: "bg-blue-500",
    countFlash: "text-blue-300",
    iconOnDark: "bg-blue-500/20 text-blue-200",
    iconBadge: "bg-blue-50 text-blue-600",
    aboutIcon: "bg-white text-blue-600 ring-1 ring-blue-100",
    aboutSurface: "bg-blue-50/40 ring-1 ring-blue-100/70",
    aboutDivider: "lg:border-blue-100",
    eyebrow: "text-blue-700",
    link: "text-blue-700 hover:text-blue-800",
    check: "text-blue-600",
    pill: "bg-white text-blue-800 ring-1 ring-blue-200",
    tagPill: "bg-white/70 text-slate-600 ring-1 ring-blue-100",
    sectionIcon: "text-blue-600",
    avatarBg: "bg-blue-600",
  },
  Cultural: {
    chip: "bg-purple-600 text-white",
    cta: "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-black/30",
    ring: "focus-visible:ring-purple-300",
    fallback: "bg-purple-700",
    line: "bg-purple-600",
    progress: "bg-purple-400",
    dot: "bg-purple-500",
    countFlash: "text-purple-300",
    iconOnDark: "bg-purple-500/20 text-purple-200",
    iconBadge: "bg-purple-50 text-purple-600",
    aboutIcon: "bg-white text-purple-600 ring-1 ring-purple-100",
    aboutSurface: "bg-purple-50/40 ring-1 ring-purple-100/70",
    aboutDivider: "lg:border-purple-100",
    eyebrow: "text-purple-700",
    link: "text-purple-700 hover:text-purple-800",
    check: "text-purple-600",
    pill: "bg-white text-purple-800 ring-1 ring-purple-200",
    tagPill: "bg-white/70 text-slate-600 ring-1 ring-purple-100",
    sectionIcon: "text-purple-600",
    avatarBg: "bg-purple-600",
  },
  Creative: {
    chip: "bg-orange-700 text-white",
    cta: "bg-orange-700 hover:bg-orange-800 text-white shadow-lg shadow-black/30",
    ring: "focus-visible:ring-orange-300",
    fallback: "bg-orange-700",
    line: "bg-orange-500",
    progress: "bg-orange-400",
    dot: "bg-orange-500",
    countFlash: "text-orange-300",
    iconOnDark: "bg-orange-500/20 text-orange-200",
    iconBadge: "bg-orange-50 text-orange-700",
    aboutIcon: "bg-white text-orange-700 ring-1 ring-orange-100",
    aboutSurface: "bg-orange-50/40 ring-1 ring-orange-100/70",
    aboutDivider: "lg:border-orange-100",
    eyebrow: "text-orange-700",
    link: "text-orange-700 hover:text-orange-800",
    check: "text-orange-600",
    pill: "bg-white text-orange-800 ring-1 ring-orange-200",
    tagPill: "bg-white/70 text-slate-600 ring-1 ring-orange-100",
    sectionIcon: "text-orange-600",
    avatarBg: "bg-orange-700",
  },
  Business: {
    chip: "bg-green-700 text-white",
    cta: "bg-green-700 hover:bg-green-800 text-white shadow-lg shadow-black/30",
    ring: "focus-visible:ring-green-300",
    fallback: "bg-green-700",
    line: "bg-green-600",
    progress: "bg-green-400",
    dot: "bg-green-500",
    countFlash: "text-green-300",
    iconOnDark: "bg-green-500/20 text-green-200",
    iconBadge: "bg-green-50 text-green-700",
    aboutIcon: "bg-white text-green-700 ring-1 ring-green-100",
    aboutSurface: "bg-green-50/40 ring-1 ring-green-100/70",
    aboutDivider: "lg:border-green-100",
    eyebrow: "text-green-700",
    link: "text-green-700 hover:text-green-800",
    check: "text-green-600",
    pill: "bg-white text-green-800 ring-1 ring-green-200",
    tagPill: "bg-white/70 text-slate-600 ring-1 ring-green-100",
    sectionIcon: "text-green-600",
    avatarBg: "bg-green-700",
  },
  Sports: {
    chip: "bg-emerald-700 text-white",
    cta: "bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg shadow-black/30",
    ring: "focus-visible:ring-emerald-300",
    fallback: "bg-emerald-700",
    line: "bg-emerald-600",
    progress: "bg-emerald-400",
    dot: "bg-emerald-500",
    countFlash: "text-emerald-300",
    iconOnDark: "bg-emerald-500/20 text-emerald-200",
    iconBadge: "bg-emerald-50 text-emerald-700",
    aboutIcon: "bg-white text-emerald-700 ring-1 ring-emerald-100",
    aboutSurface: "bg-emerald-50/40 ring-1 ring-emerald-100/70",
    aboutDivider: "lg:border-emerald-100",
    eyebrow: "text-emerald-700",
    link: "text-emerald-700 hover:text-emerald-800",
    check: "text-emerald-600",
    pill: "bg-white text-emerald-800 ring-1 ring-emerald-200",
    tagPill: "bg-white/70 text-slate-600 ring-1 ring-emerald-100",
    sectionIcon: "text-emerald-600",
    avatarBg: "bg-emerald-700",
  },
  Other: {
    chip: "bg-slate-700 text-white",
    cta: "bg-white hover:bg-slate-100 text-slate-900 shadow-lg shadow-black/30",
    ring: "focus-visible:ring-white",
    fallback: "bg-slate-800",
    line: "bg-slate-400",
    progress: "bg-slate-300",
    dot: "bg-slate-400",
    countFlash: "text-slate-300",
    iconOnDark: "bg-white/10 text-slate-200",
    iconBadge: "bg-slate-100 text-slate-600",
    aboutIcon: "bg-white text-slate-600 ring-1 ring-slate-200",
    aboutSurface: "bg-slate-100/50 ring-1 ring-slate-200/70",
    aboutDivider: "lg:border-slate-200",
    eyebrow: "text-slate-600",
    link: "text-slate-700 hover:text-slate-900",
    check: "text-slate-600",
    pill: "bg-white text-slate-700 ring-1 ring-slate-200",
    tagPill: "bg-white/70 text-slate-600 ring-1 ring-slate-200",
    sectionIcon: "text-slate-500",
    avatarBg: "bg-slate-900",
  },
};

const accentFor = (category) => categoryAccent[category] ?? categoryAccent.Other;

const statusStyle = {
  upcoming: { label: "Upcoming", className: "bg-white text-slate-900" },
  ongoing: { label: "Live now", className: "bg-emerald-400 text-emerald-950" },
  completed: {
    label: "Completed",
    className: "bg-white/15 text-white ring-1 ring-inset ring-white/25",
  },
  cancelled: { label: "Cancelled", className: "bg-red-600 text-white" },
};

const chipBase =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap";

// Focus ring for controls sitting on the dark banner.
const darkFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

// Non-action registration states, as quiet pills on the banner.
const statePill =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-center text-sm font-bold";

// ─── Helpers ──────────────────────────────────────────────────
const idOf = (x) => String(x?._id ?? x);

const countFormat = new Intl.NumberFormat("en-IN");

const fmtDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
  });
};

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const fmtShort = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// "2d 5h", "4h 12m", "12m".
const fmtSpan = (ms) => {
  const mins = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return h ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  return `${Math.max(m, 1)}m`;
};

// "Year 3", "Years 1–2", "Years 1, 3" (expects a sorted list).
const fmtYears = (years) => {
  if (years.length === 1) return `Year ${years[0]}`;
  const consecutive = years.every((y, i) => i === 0 || y === years[i - 1] + 1);
  return consecutive
    ? `Years ${years[0]}–${years[years.length - 1]}`
    : `Years ${years.join(", ")}`;
};

// Mirrors the backend rule. Writes enforce deadline <= start, so for every
// valid event this is simply "the deadline if set, otherwise the start"; the
// min() only guards events stored before that check existed.
const registrationCutoff = (event) => {
  const start = new Date(event.startDateTime);
  if (!event.registrationDeadline) return start;
  const deadline = new Date(event.registrationDeadline);
  return deadline < start ? deadline : start;
};

const URGENT_MS = 48 * 60 * 60 * 1000;

// Re-renders every `interval` ms so countdowns and progress stay current.
const useNow = (interval) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
};

const clubInitials = (name) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// ─── Building blocks ──────────────────────────────────────────
const Skeleton = () => (
  <div
    className="max-w-5xl mx-auto px-4 sm:px-6 py-2 space-y-5"
    aria-busy="true"
    aria-label="Loading event"
  >
    <div className="w-12 h-3 bg-slate-200 rounded motion-safe:animate-pulse" />
    <div className="rounded-2xl overflow-hidden border border-slate-200/70 bg-white motion-safe:animate-pulse">
      <div className="min-h-44 sm:min-h-52 lg:min-h-60 bg-slate-800 flex flex-col justify-end gap-3 p-4 sm:p-6 lg:p-8">
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-md bg-white/10" />
          <div className="h-6 w-20 rounded-md bg-white/10" />
        </div>
        <div className="h-8 w-2/3 rounded-lg bg-white/15" />
        <div className="h-4 w-40 rounded bg-white/10" />
      </div>
      <div className="h-1 bg-slate-200" />
      <div className="grid gap-4 p-4 lg:grid-cols-3 sm:p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
    <div className="space-y-5 motion-safe:animate-pulse">
      <div className="h-44 bg-slate-100/70 rounded-2xl" />
      <div className="h-20 bg-amber-50/50 border border-amber-200/70 rounded-2xl" />
      <div className="h-24 bg-white border border-slate-100 rounded-2xl" />
    </div>
  </div>
);

const StatusPill = ({ phase, accent }) => {
  const style = statusStyle[phase];
  return (
    <span className={`${chipBase} ${style.className}`}>
      {phase === "ongoing" ? (
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-950/50 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-950" />
        </span>
      ) : phase === "upcoming" ? (
        <span className={`h-2 w-2 rounded-full ${accent.dot}`} aria-hidden="true" />
      ) : phase === "cancelled" ? (
        <Ban size={12} aria-hidden="true" />
      ) : null}
      {style.label}
    </span>
  );
};

// One item of the info rail. dt/dd must be direct children of the item (valid
// <dl>), so the icon lives inside the <dt>, positioned into the left gutter.
const FactItem = ({ icon: Icon, label, value, detail, accent, className = "" }) => (
  <div className={`relative min-w-0 border-slate-100 py-3 pr-4 pl-15 sm:py-4 sm:pr-5 sm:pl-16 ${className}`}>
    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      <span
        className={`absolute left-4 top-3.5 sm:left-5 sm:top-4.5 flex h-8 w-8 items-center justify-center rounded-lg ${accent.iconBadge}`}
        aria-hidden="true"
      >
        <Icon size={16} />
      </span>
      {label}
    </dt>
    <dd className="mt-0.5 text-sm font-semibold leading-snug text-slate-900 break-words">
      {value}
    </dd>
    {detail && <dd className="text-xs font-medium text-slate-500">{detail}</dd>}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────
export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const now = useNow(60_000);

  const [event, setEvent] = useState(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // "notFound" | "failed"
  const [reloadKey, setReloadKey] = useState(0);
  const [aboutExpanded, setAboutExpanded] = useState(false);

  // Registration actions: one at a time; the control stays disabled until the
  // request settles, so an older response can't overwrite a newer state.
  const [pending, setPending] = useState(null); // "register" | "unregister"
  const [actionError, setActionError] = useState("");
  const [countFlash, setCountFlash] = useState(false);
  const flashTimer = useRef(null);

  // Announcements page through their own endpoint, 10 at a time.
  const [announcements, setAnnouncements] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const activeEventRef = useRef(id);

  const [showBanner, onBannerError] = useImageOk(event?.banner);
  const [showClubLogo, onClubLogoError] = useImageOk(event?.organizerClub?.logo);

  const descriptionRef = useRef(null);
  const descriptionClamped = useIsClamped(
    descriptionRef,
    !aboutExpanded,
    event?.description,
  );

  // Fetched per event only. Registration changes update local state and the
  // user in context, so they never trigger a refetch (or a skeleton flash).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setAboutExpanded(false);
    setActionError("");
    getEventById(id)
      .then((res) => {
        if (cancelled) return;
        const data = res.data.data;
        setEvent(data.event);
        setIsOrganizer(!!data.isOrganizer);
        setRegistered(!!data.isRegistered);
        setCount(data.registrationCount ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        const status = err.response?.status;
        setLoadError(status === 404 || status === 400 ? "notFound" : "failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const fetchAnnouncements = useCallback(
    async (fromOffset, append) => {
      const requestedEvent = id;
      if (append) setLoadMoreLoading(true);
      else setFeedLoading(true);
      setFeedError(false);
      try {
        const res = await getAnnouncements("event", id, fromOffset);
        if (activeEventRef.current !== requestedEvent) return;
        const { announcements: page = [], hasMore: more, nextOffset } =
          res?.data?.data || {};
        setAnnouncements((prev) => (append ? [...prev, ...page] : page));
        setHasMore(more);
        setOffset(nextOffset);
      } catch (err) {
        if (activeEventRef.current !== requestedEvent) return;
        console.error("Failed to load announcements:", err);
        setFeedError(true);
      } finally {
        if (activeEventRef.current === requestedEvent) {
          setFeedLoading(false);
          setLoadMoreLoading(false);
        }
      }
    },
    [id],
  );

  useEffect(() => {
    activeEventRef.current = id;
    setAnnouncements([]);
    setHasMore(false);
    fetchAnnouncements(0, false);
  }, [id, fetchAnnouncements]);

  // Take the server's answer, and mirror it into the cached user so other
  // pages (event list, club page) agree without a refetch.
  const applyRegistration = (isRegistered, newCount) => {
    setRegistered(isRegistered);
    if (typeof newCount === "number") {
      setCount(newCount);
      setCountFlash(true);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setCountFlash(false), 700);
    }
    setUser((prev) => {
      if (!prev) return prev;
      const others = (prev.registeredEvents || []).filter((e) => idOf(e) !== id);
      return { ...prev, registeredEvents: isRegistered ? [...others, id] : others };
    });
  };

  const handleRegister = async () => {
    if (pending) return;
    setPending("register");
    setActionError("");
    try {
      const res = await registerForEvent(id);
      applyRegistration(true, res.data.data.registrationCount);
    } catch (err) {
      if (err.response?.status === 409) {
        // Registered elsewhere (another tab); pick up the current count.
        applyRegistration(true);
        getEventById(id)
          .then((res) => setCount(res.data.data.registrationCount ?? 0))
          .catch(() => {});
      } else {
        setActionError(
          err.response?.data?.message ||
            "Couldn't register. Check your connection and try again.",
        );
      }
    } finally {
      setPending(null);
    }
  };

  const handleUnregister = async () => {
    if (pending) return;
    if (
      !window.confirm(
        `Cancel your registration for ${event.eventName}? You can register again until registration closes.`,
      )
    )
      return;
    setPending("unregister");
    setActionError("");
    try {
      const res = await unregisterFromEvent(id);
      applyRegistration(false, res.data.data.registrationCount);
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Couldn't cancel your registration. Try again.",
      );
    } finally {
      setPending(null);
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    try {
      await deleteAnnouncement(annId);
      setAnnouncements((prev) => prev.filter((a) => a._id !== annId));
      // Everything after it shifted up one; keep the next page from skipping an item.
      setOffset((o) => Math.max(0, o - 1));
    } catch (error) {
      console.error(error);
    }
  };

  const handleLoadMore = () => {
    if (!loadMoreLoading && hasMore) fetchAnnouncements(offset, true);
  };

  if (loading) return <Skeleton />;
  if (loadError || !event)
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          {loadError === "failed" ? "Couldn't load this event" : "Event not found"}
        </p>
        <p className="text-xs text-slate-500">
          {loadError === "failed"
            ? "Check your connection and try again."
            : "It may have been removed, or the link is incorrect."}
        </p>
        {loadError === "failed" ? (
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 transition-colors ${focusRing}`}
          >
            Try again
          </button>
        ) : (
          <Link
            to="/community/events"
            className={`inline-block px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 transition-colors ${focusRing}`}
          >
            Back to events
          </Link>
        )}
      </div>
    );

  // ── Derived state ──
  const accent = accentFor(event.category);
  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);
  const cutoff = registrationCutoff(event);
  const hasDeadline = !!event.registrationDeadline;
  const isCancelled = event.status === "Cancelled";
  const phase = isCancelled
    ? "cancelled"
    : now < start
      ? "upcoming"
      : now <= end
        ? "ongoing"
        : "completed";
  const regOpen = !isCancelled && now < cutoff;
  const closingSoon = regOpen && cutoff - now < URGENT_MS;
  const sameDay = start.toDateString() === end.toDateString();
  const progress =
    phase === "ongoing"
      ? Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
      : 0;

  const branches = event.eligibleBranches || [];
  const years = [...(event.eligibleYears || [])].sort((a, b) => a - b);
  const restricted = branches.length > 0 || years.length > 0;
  const ineligible =
    !!user &&
    ((branches.length > 0 && !branches.includes(user.branch)) ||
      (years.length > 0 && !years.includes(user.year)));
  const eligibilityText = [
    branches.length > 0 && branches.join(", "),
    years.length > 0 && fmtYears(years),
  ]
    .filter(Boolean)
    .join(" · ");

  const club = event.organizerClub;
  const tags = (event.tags || []).filter(Boolean);

  // ── Registration: action + subline for the current state ──
  let action;
  let subline = null;
  if (isCancelled) {
    action = (
      <p className={`${statePill} bg-red-500/20 text-red-100 ring-1 ring-inset ring-red-300/30`}>
        <Ban size={16} aria-hidden="true" />
        Event cancelled
      </p>
    );
    subline = "The organizers cancelled this event.";
  } else if (registered) {
    action = (
      <p className={`${statePill} bg-emerald-400/15 text-emerald-200 ring-1 ring-inset ring-emerald-300/40`}>
        <Check size={16} strokeWidth={3} aria-hidden="true" />
        You're registered
      </p>
    );
    subline =
      phase === "ongoing"
        ? "Happening now"
        : phase === "completed"
          ? "This event has ended."
          : regOpen
            ? `See you on ${fmtDate(start)}`
            : "Registration is closed.";
  } else {
    const closed = (label, line) => {
      action = (
        <p className={`${statePill} bg-white/10 text-white/85 ring-1 ring-inset ring-white/15`}>
          <Lock size={15} aria-hidden="true" />
          {label}
        </p>
      );
      subline = line;
    };
    if (phase === "completed") closed("This event has ended", null);
    else if (phase === "ongoing") closed("Registration closed", "This event has already started.");
    else if (!regOpen) closed("Registration closed", `Closed on ${fmtShort(cutoff)}`);
    else if (ineligible) closed("Not eligible", `Open to ${eligibilityText}`);
    else {
      action = (
        <button
          onClick={handleRegister}
          disabled={!!pending}
          aria-busy={pending === "register"}
          className={`group/cta flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition duration-150 motion-safe:active:scale-[.98] disabled:cursor-wait disabled:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${accent.ring} ${accent.cta}`}
        >
          {pending === "register" ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Registering…
            </>
          ) : (
            <>
              Register now
              <ArrowRight
                size={16}
                aria-hidden="true"
                className="motion-safe:transition-transform motion-safe:group-hover/cta:translate-x-0.5"
              />
            </>
          )}
        </button>
      );
      // The close time lives in the info rail; urgency gets the pill below.
    }
  }

  const zeroCountText =
    regOpen && !registered && !ineligible
      ? "Be the first to register"
      : phase === "upcoming"
        ? "No registrations yet"
        : "No registrations";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 space-y-5">
      {/* Back + (organizers) compact manage links — kept off the hero. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <button
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded transition-colors ${focusRing}`}
        >
          <ArrowLeft size={13} aria-hidden="true" /> Back
        </button>
        {isOrganizer && (
          <nav aria-label="Manage event" className="flex flex-wrap items-center gap-0.5">
            <span className="hidden sm:inline px-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Manage
            </span>
            <ManageLink to={`/community/events/${id}/edit`} state={{ event }} icon={Pencil}>
              Edit event
            </ManageLink>
            <ManageLink to={`/events/${id}/create-notice`} icon={Plus}>
              Post notice
            </ManageLink>
            <ManageLink to={`/community/event/${id}/announcements/create`} icon={Plus}>
              Post announcement
            </ManageLink>
          </nav>
        )}
      </div>

      {/* ── Hero: banner (title + registration) over a compact info rail ── */}
      <header className="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className="relative isolate flex min-h-44 sm:min-h-52 lg:min-h-60 flex-col justify-end overflow-hidden bg-slate-950">
          {showBanner ? (
            <img
              src={event.banner}
              alt=""
              onError={onBannerError}
              className="absolute inset-0 -z-10 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-[1200ms] motion-safe:group-hover:scale-[1.03]"
            />
          ) : (
            <div aria-hidden="true" className={`absolute inset-0 -z-10 ${accent.fallback}`}>
              <CalendarDays
                size={200}
                strokeWidth={1.25}
                className="absolute -right-8 -top-8 text-white/10"
              />
            </div>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-t from-slate-950 via-slate-950/70 to-slate-950/5"
          />

          <div className="grid gap-5 px-4 pt-12 pb-5 sm:px-6 sm:pb-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end lg:gap-8 lg:px-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${chipBase} ${accent.chip}`}>{event.category}</span>
                <StatusPill phase={phase} accent={accent} />
              </div>

              <h1
                className={`mt-3 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-[1.1] break-words text-balance text-shadow-lg ${
                  isCancelled ? "line-through decoration-red-400/70" : ""
                }`}
              >
                {event.eventName}
              </h1>

              {/* Organizer + timing strip (the page's live pulse). */}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                {club && (
                  <Link
                    to={`/community/clubs/${club._id}`}
                    className={`group/club inline-flex items-center gap-2 rounded-lg text-sm font-medium text-white/80 hover:text-white transition-colors ${darkFocus}`}
                  >
                    <span
                      className={`flex h-6 w-6 flex-none items-center justify-center overflow-hidden rounded-md text-[10px] font-black ${
                        showClubLogo ? "bg-white" : "bg-white/15 text-white"
                      }`}
                      aria-hidden="true"
                    >
                      {showClubLogo ? (
                        <img
                          src={club.logo}
                          alt=""
                          onError={onClubLogoError}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        clubInitials(club.clubName)
                      )}
                    </span>
                    <span className="min-w-0 break-words">
                      by{" "}
                      <span className="font-bold text-white underline-offset-4 decoration-white/50 group-hover/club:underline">
                        {club.clubName}
                      </span>
                    </span>
                  </Link>
                )}

                {phase === "upcoming" && (
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/85">
                    <Clock size={15} aria-hidden="true" className="text-white/60" />
                    {start - now < 60_000 ? (
                      "Starting now"
                    ) : (
                      <>
                        Starts in{" "}
                        <strong className="font-black text-white tabular-nums">
                          {fmtSpan(start - now)}
                        </strong>
                      </>
                    )}
                  </p>
                )}
                {phase === "ongoing" && (
                  <div className="flex min-w-0 flex-1 basis-56 max-w-sm items-center gap-3 text-sm font-semibold text-white/85">
                    <div
                      role="progressbar"
                      aria-label="Event progress"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"
                    >
                      <div
                        className={`h-full rounded-full ${accent.progress} motion-safe:transition-[width] motion-safe:duration-700`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap">
                      Ends {sameDay ? `at ${fmtTime(end)}` : `${fmtShort(end)} · ${fmtTime(end)}`}
                    </span>
                  </div>
                )}
                {phase === "completed" && (
                  <p className="text-sm font-semibold text-white/70">Ended {fmtShort(end)}</p>
                )}
              </div>
            </div>

            {/* Registration: straight on the banner, no box of its own. */}
            <section aria-labelledby="event-registration" className="min-w-0">
              <h2 id="event-registration" className="sr-only">
                Registration
              </h2>
              <div className="flex items-center gap-3" aria-live="polite" aria-atomic="true">
                <span
                  className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${accent.iconOnDark}`}
                  aria-hidden="true"
                >
                  <Users size={19} />
                </span>
                {count > 0 ? (
                  <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                    <span
                      className={`text-3xl sm:text-4xl font-black leading-none tracking-tight tabular-nums transition-colors duration-500 ${
                        countFlash ? accent.countFlash : "text-white"
                      }`}
                    >
                      {countFormat.format(count)}
                    </span>
                    <span className="text-sm font-semibold text-white/75">registered</span>
                  </p>
                ) : (
                  <p className="text-base font-bold leading-tight text-white">{zeroCountText}</p>
                )}
              </div>

              <div className="mt-3">{action}</div>

              {(subline || closingSoon || (registered && regOpen)) && (
                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-xs font-medium text-white/75">
                  {closingSoon && !registered && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-amber-950">
                      <Timer size={12} aria-hidden="true" />
                      Closes in {fmtSpan(cutoff - now)}
                    </span>
                  )}
                  {subline && <span>{subline}</span>}
                  {registered && regOpen && (
                    <button
                      onClick={handleUnregister}
                      disabled={!!pending}
                      className={`inline-flex items-center gap-1 rounded px-1 py-1 font-semibold text-white/75 underline underline-offset-2 hover:text-white disabled:cursor-wait disabled:opacity-60 transition-colors ${darkFocus}`}
                    >
                      {pending === "unregister" && (
                        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      )}
                      {pending === "unregister" ? "Cancelling…" : "Cancel registration"}
                    </button>
                  )}
                </div>
              )}

              {actionError && (
                <p role="alert" className="mt-2 text-center text-xs font-semibold text-red-300">
                  {actionError}
                </p>
              )}
            </section>
          </div>
        </div>

        <div aria-hidden="true" className={`h-1 ${accent.line}`} />

        {/* Compact info rail: stacked rows on phones, When | Venue with the
            deadline spanning below on tablets, three across on desktop.
            Per-item borders keep the dividers right at every breakpoint. */}
        <dl className="grid sm:grid-cols-2 lg:grid-cols-3">
          <FactItem
            icon={CalendarDays}
            label="When"
            value={sameDay ? fmtDate(start) : `${fmtDate(start)} · ${fmtTime(start)}`}
            detail={
              sameDay
                ? `${fmtTime(start)} – ${fmtTime(end)} · ${fmtSpan(end - start)}`
                : `until ${fmtDate(end)} · ${fmtTime(end)}`
            }
            accent={accent}
          />
          <FactItem
            icon={MapPin}
            label="Venue"
            value={event.venue || "To be announced"}
            accent={accent}
            className="border-t sm:border-t-0 sm:border-l"
          />
          <FactItem
            className="border-t sm:col-span-2 lg:col-span-1 lg:border-t-0 lg:border-l"
            icon={Timer}
            label="Registration closes"
            value={hasDeadline ? `${fmtDate(cutoff)} · ${fmtTime(cutoff)}` : "When the event starts"}
            detail={!isCancelled && !regOpen ? "Closed" : null}
            accent={accent}
          />
        </dl>
      </header>

      {/* ── About: a whisper-tinted editorial block, calmer than the hero ── */}
      <section
        aria-labelledby="event-about"
        className={`rounded-2xl p-5 sm:p-7 ${accent.aboutSurface}`}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-10">
          <div className="min-w-0">
            <p
              className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${accent.eyebrow}`}
            >
              <Sparkles size={13} aria-hidden="true" />
              {event.category && event.category !== "Other"
                ? `${event.category} event`
                : "Campus event"}
            </p>
            <h2 id="event-about" className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">
              About this event
            </h2>
            {event.description ? (
              <>
                <p
                  ref={descriptionRef}
                  className={`mt-3 max-w-prose text-[15px] leading-7 text-slate-700 whitespace-pre-line break-words ${
                    aboutExpanded ? "" : "line-clamp-6"
                  }`}
                >
                  {event.description}
                </p>
                {descriptionClamped && (
                  <button
                    onClick={() => setAboutExpanded((v) => !v)}
                    aria-expanded={aboutExpanded}
                    className={`mt-2 inline-flex items-center gap-1 rounded text-[13px] font-semibold transition-colors ${accent.link} ${focusRing}`}
                  >
                    {aboutExpanded ? (
                      <>
                        Show less <ChevronUp size={14} aria-hidden="true" />
                      </>
                    ) : (
                      <>
                        Show more <ChevronDown size={14} aria-hidden="true" />
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No description yet.</p>
            )}

            {tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
                {tags.map((t) => (
                  <li
                    key={t}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${accent.tagPill}`}
                  >
                    #{t}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div
            className={`min-w-0 border-t border-slate-200/70 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 ${accent.aboutDivider}`}
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent.aboutIcon}`}
                aria-hidden="true"
              >
                <UserCheck size={15} />
              </span>
              Who can join
            </h3>

            {!restricted ? (
              <p className="mt-3 flex items-start gap-2">
                <CheckCircle2 size={18} className={`mt-0.5 flex-none ${accent.check}`} aria-hidden="true" />
                <span>
                  <span className="block text-base font-bold text-slate-900">Everyone</span>
                  <span className="text-xs font-medium text-slate-600">All branches and years</span>
                </span>
              </p>
            ) : (
              <>
                <dl className="mt-3 space-y-3">
                  {branches.length > 0 && (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Branches
                      </dt>
                      <dd className="mt-1.5 flex flex-wrap gap-1.5">
                        {branches.map((b) => (
                          <span
                            key={b}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${accent.pill}`}
                          >
                            {b}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {years.length > 0 && (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Year
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">{fmtYears(years)}</dd>
                    </div>
                  )}
                </dl>
                {user && (
                  <p
                    className={`mt-4 flex items-center gap-1.5 text-xs font-semibold ${
                      ineligible ? "text-slate-600" : "text-emerald-700"
                    }`}
                  >
                    {ineligible ? (
                      <Lock size={13} aria-hidden="true" />
                    ) : (
                      <CheckCircle2 size={14} aria-hidden="true" />
                    )}
                    {ineligible ? "You're not eligible" : "You're eligible"}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Notices ── */}
      <section
        aria-label="Event notices"
        className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 sm:p-5"
      >
        <NoticeFeed
          targetType="events"
          targetId={id}
          title="Notices"
          canPost={isOrganizer}
          showActions={isOrganizer}
          compact={true}
        />
      </section>

      {/* ── Announcements ── */}
      <section aria-labelledby="event-announcements" className="min-w-0">
        <SectionHeader
          id="event-announcements"
          icon={Megaphone}
          title="Announcements"
          iconClassName={accent.sectionIcon}
          titleClassName="text-base font-bold text-slate-900"
        />
        {feedLoading && announcements.length === 0 ? (
          <div className="space-y-3 motion-safe:animate-pulse">
            <div className="h-24 bg-white border border-slate-100 rounded-2xl" />
            <div className="h-24 bg-white border border-slate-100 rounded-2xl" />
          </div>
        ) : announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((a) => (
              <AnnouncementCard
                key={a._id}
                announcement={a}
                variant="detail"
                avatarBg={accent.avatarBg}
                isEligible={isOrganizer}
                onDelete={handleDeleteAnnouncement}
              />
            ))}
            {feedError && (
              <p className="text-center text-xs text-red-600">
                Couldn't load more announcements.
              </p>
            )}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadMoreLoading}
                className={`flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-400 hover:text-slate-900 transition-colors disabled:opacity-60 ${focusRing}`}
              >
                {loadMoreLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-slate-400" aria-hidden="true" />{" "}
                    Loading…
                  </>
                ) : feedError ? (
                  "Try again"
                ) : (
                  "Load more"
                )}
              </button>
            )}
          </div>
        ) : feedError ? (
          <div className="flex items-center justify-between gap-3 px-4 py-4 bg-white border border-slate-100 rounded-2xl">
            <p className="text-xs text-slate-500">Couldn't load announcements.</p>
            <button
              onClick={() => fetchAnnouncements(0, false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 transition-colors ${focusRing}`}
            >
              Try again
            </button>
          </div>
        ) : (
          <p className="px-4 py-4 text-xs text-slate-500 bg-white border border-slate-100 rounded-2xl">
            No announcements yet. Updates from the organizers will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
