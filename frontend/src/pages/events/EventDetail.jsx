import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Ban, CheckCircle2, Loader2, Pencil, Plus } from "lucide-react";
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
import useNow from "../../hooks/useNow";
import {
  Facts,
  LoadError,
  LoadMore,
  LogoTile,
  PageMessage,
  PageTitle,
  Row,
  Rows,
  SectionHead,
  btnGhost,
  btnGhostSm,
  btnLg,
  crumbLink,
  focusRing,
  note,
  panel,
  tone,
} from "../../components/common/ui";
import NoticeFeed from "../../components/cards/NoticeFeed";
import AnnouncementCard from "../announcements/AnnouncementCard";
import { formatClock, formatShortDate } from "../../utils/formatDate";
import { formatEventDay, registrationCutoff } from "./eventDates";

// ─── Helpers ──────────────────────────────────────────────────
const idOf = (x) => String(x?._id ?? x);

const countFormat = new Intl.NumberFormat("en-IN");

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

const URGENT_MS = 48 * 60 * 60 * 1000;

// ─── Building blocks ──────────────────────────────────────────
const Skeleton = () => (
  <div className="animate-pulse pb-10" aria-busy="true" aria-label="Loading event">
    <div className="aspect-[16/10] rounded-[18px] bg-soft lg:aspect-[21/8] lg:rounded-3xl" />
    <div className="mt-9 h-4 w-32 rounded bg-soft" />
    <div className="mt-3 h-10 w-2/3 rounded-lg bg-soft" />
    <div className="mt-9 h-24 rounded-panel bg-soft" />
    <div className="mt-14 space-y-3">
      <div className="h-4 w-full max-w-xl rounded bg-soft" />
      <div className="h-4 w-full max-w-lg rounded bg-soft" />
      <div className="h-4 w-full max-w-md rounded bg-soft" />
    </div>
  </div>
);

// A label on the left, its value on the right ("Branches … All branches").
const Pair = ({ label, value }) => (
  <li className="flex min-h-14 items-center justify-between gap-6 py-3">
    <span className="text-[15px] font-semibold tracking-[-0.018em] text-ink">{label}</span>
    <span className="min-w-0 break-words text-right text-[13.5px] text-ink-2">{value}</span>
  </li>
);

// ─── Page ─────────────────────────────────────────────────────
export default function EventDetail() {
  const { id } = useParams();
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
    return loadError === "failed" ? (
      <PageMessage
        title="Couldn't load this event"
        action={
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={btnGhost}>
            Try again
          </button>
        }
      >
        Check your connection and try again.
      </PageMessage>
    ) : (
      <PageMessage
        title="Event not found"
        action={
          <Link to="/community/events" className={btnGhost}>
            Back to events
          </Link>
        }
      >
        It may have been removed, or the link is incorrect.
      </PageMessage>
    );

  // ── Derived state ──
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
    .join(", ");

  const club = event.organizerClub;
  const tags = (event.tags || []).filter(Boolean);

  // The line under the title: where the event is in time.
  const timing =
    phase === "cancelled"
      ? { text: "Cancelled", className: tone.urgent }
      : phase === "upcoming"
        ? { text: start - now < 60_000 ? "Starting now" : `Starts in ${fmtSpan(start - now)}` }
        : phase === "ongoing"
          ? {
              text: `Happening now, ends ${
                sameDay ? `at ${formatClock(end)}` : `${formatShortDate(end)}, ${formatClock(end)}`
              }`,
              className: tone.live,
            }
          : { text: `Ended ${formatShortDate(end)}` };

  // ── Registration: headline, line under it and the action for the current state ──
  let headline;
  let headlineTone = "text-ink";
  let subline = null;
  let sublineTone = "text-ink-2";
  let action = null;
  if (isCancelled) {
    headline = "Event cancelled";
    headlineTone = "text-urgent";
    subline = "The organizers cancelled this event.";
  } else if (registered) {
    headline = "You're going";
    headlineTone = "text-live";
    subline =
      phase === "ongoing"
        ? "Happening now"
        : phase === "completed"
          ? "This event has ended."
          : regOpen
            ? `You can cancel until registration closes on ${formatEventDay(cutoff)}.`
            : "Registration is closed.";
    if (regOpen)
      action = (
        <button
          type="button"
          onClick={handleUnregister}
          disabled={!!pending}
          className={`mt-5 w-full ${btnGhost}`}
        >
          {pending === "unregister" && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {pending === "unregister" ? "Cancelling…" : "Cancel registration"}
        </button>
      );
  } else if (phase === "completed") {
    headline = "This event has ended";
  } else if (phase === "ongoing") {
    headline = "Registration closed";
    subline = "This event has already started.";
  } else if (!regOpen) {
    headline = "Registration closed";
    subline = `Closed on ${formatShortDate(cutoff)}`;
  } else if (ineligible) {
    headline = "Not open to you";
    subline = `Open to ${eligibilityText}`;
  } else {
    headline = "Registration is open";
    if (closingSoon) {
      subline = `Closes in ${fmtSpan(cutoff - now)}`;
      sublineTone = tone.warn;
    } else {
      subline = hasDeadline ? `Closes ${formatEventDay(cutoff)}` : "Open until the event starts";
    }
    action = (
      <button
        type="button"
        onClick={handleRegister}
        disabled={!!pending}
        aria-busy={pending === "register"}
        className={`mt-5 w-full ${btnLg}`}
      >
        {pending === "register" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        {pending === "register" ? "Registering…" : "Register"}
      </button>
    );
  }

  const zeroCountText =
    regOpen && !registered && !ineligible
      ? "Be the first to register"
      : phase === "upcoming"
        ? "No registrations yet"
        : "No registrations";

  const facts = [
    { label: "When", value: [formatEventDay(start), formatClock(start)] },
    { label: "Until", value: sameDay ? formatClock(end) : [formatEventDay(end), formatClock(end)] },
    { label: "Venue", value: event.venue || "To be announced" },
    {
      label: "Registration closes",
      value: hasDeadline ? [formatEventDay(cutoff), formatClock(cutoff)] : "When the event starts",
      detail: !isCancelled && !regOpen ? "Closed" : null,
    },
  ];

  return (
    <div className="pb-10 lg:pb-20">
      {showBanner && (
        <img
          src={event.banner}
          alt=""
          onError={onBannerError}
          className="mb-5 mt-1 aspect-[16/10] w-full rounded-[18px] object-cover shadow-[0_1px_2px_rgb(14_15_17/0.06),0_36px_60px_-36px_rgb(14_15_17/0.5)] lg:aspect-[21/8] lg:rounded-3xl"
        />
      )}

      <PageTitle
        large
        crumb={
          <>
            <Link to="/community/events" className={crumbLink}>
              Events
            </Link>{" "}
            / {event.category}
          </>
        }
        title={
          isCancelled ? (
            <span className="line-through decoration-urgent/60">{event.eventName}</span>
          ) : (
            event.eventName
          )
        }
        sub={<span className={timing.className}>{timing.text}</span>}
      >
        {isOrganizer && (
          <nav aria-label="Manage event" className="flex flex-wrap items-center gap-2">
            <Link to={`/community/events/${id}/edit`} state={{ event }} className={btnGhostSm}>
              <Pencil size={13} aria-hidden="true" /> Edit event
            </Link>
            <Link to={`/events/${id}/create-notice`} className={btnGhostSm}>
              <Plus size={14} aria-hidden="true" /> Post notice
            </Link>
            <Link to={`/community/event/${id}/announcements/create`} className={btnGhostSm}>
              <Plus size={14} aria-hidden="true" /> Post announcement
            </Link>
          </nav>
        )}
      </PageTitle>

      <Facts className="mt-9" facts={facts} />

      <div className="mt-9 grid grid-cols-1 gap-y-11 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-x-[72px]">
        <div className="min-w-0 space-y-11 lg:space-y-14">
          <section aria-labelledby="event-about">
            <SectionHead id="event-about" title="About" />
            {event.description ? (
              <>
                <p
                  ref={descriptionRef}
                  className={`max-w-[62ch] whitespace-pre-line break-words text-[15.5px] leading-[1.65] text-ink/90 ${
                    aboutExpanded ? "" : "line-clamp-[8]"
                  }`}
                >
                  {event.description}
                </p>
                {(descriptionClamped || aboutExpanded) && (
                  <button
                    type="button"
                    onClick={() => setAboutExpanded((v) => !v)}
                    aria-expanded={aboutExpanded}
                    className={`mt-2 rounded text-[13.5px] font-[550] text-ink-2 transition-colors hover:text-ink ${focusRing}`}
                  >
                    {aboutExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </>
            ) : (
              <p className={note}>No description yet.</p>
            )}
            {tags.length > 0 && (
              <ul aria-label="Tags" className="mt-[18px] flex flex-wrap gap-x-3.5 gap-y-1 text-[14.5px] text-ink-3">
                {tags.map((t) => (
                  <li key={t}>#{t}</li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="event-who">
            <SectionHead id="event-who" title="Who can join" />
            <ul className="divide-y divide-line">
              <Pair label="Branches" value={branches.length > 0 ? branches.join(", ") : "All branches"} />
              <Pair label="Years" value={years.length > 0 ? fmtYears(years) : "All years"} />
            </ul>
            {restricted && user && (
              <p className={`mt-2 text-[13.5px] ${ineligible ? "text-ink-2" : tone.live}`}>
                {ineligible ? "You're not eligible for this event." : "You're eligible."}
              </p>
            )}
          </section>

          <NoticeFeed
            targetType="events"
            targetId={id}
            title="Notices"
            canPost={isOrganizer}
            showActions={isOrganizer}
          />

          <section aria-labelledby="event-announcements" className="min-w-0">
            <SectionHead id="event-announcements" title="Announcements" />
            {feedLoading && announcements.length === 0 ? (
              <div className="animate-pulse space-y-3 py-1.5" aria-busy="true">
                <div className="h-4 w-1/3 rounded bg-soft" />
                <div className="h-4 w-2/3 rounded bg-soft" />
              </div>
            ) : announcements.length > 0 ? (
              <>
                <ul className="divide-y divide-line">
                  {announcements.map((a) => (
                    <AnnouncementCard
                      key={a._id}
                      announcement={a}
                      variant="detail"
                      isEligible={isOrganizer}
                      onDelete={handleDeleteAnnouncement}
                    />
                  ))}
                </ul>
                {feedError && (
                  <div className="mt-4">
                    <LoadError>Couldn't load more announcements.</LoadError>
                  </div>
                )}
                {hasMore && (
                  <LoadMore onClick={handleLoadMore} loading={loadMoreLoading} failed={feedError} />
                )}
              </>
            ) : feedError ? (
              <LoadError onRetry={() => fetchAnnouncements(0, false)}>
                Couldn't load announcements.
              </LoadError>
            ) : (
              <p className={note}>
                No announcements yet. Updates from the organizers will appear here.
              </p>
            )}
          </section>
        </div>

        {/* Registration leads on phones; on desktop it stays in view beside the page. */}
        <aside className="min-w-0 max-lg:order-first lg:sticky lg:top-6 lg:self-start">
          <section aria-labelledby="event-registration" className={`p-6 ${panel}`}>
            <h2 id="event-registration" className="sr-only">
              Registration
            </h2>
            <div aria-live="polite" aria-atomic="true">
              <p className={`flex items-center gap-2 text-[17px] font-[650] tracking-[-0.025em] ${headlineTone}`}>
                {isCancelled ? (
                  <Ban size={18} aria-hidden="true" />
                ) : (
                  registered && <CheckCircle2 size={19} aria-hidden="true" />
                )}
                {headline}
              </p>
              {subline && <p className={`mt-1.5 text-[14.5px] ${sublineTone}`}>{subline}</p>}
            </div>

            {action}

            {actionError && (
              <p role="alert" className="mt-3 text-[13.5px] text-urgent">
                {actionError}
              </p>
            )}

            <p className="mt-4 border-t border-line pt-4 text-[14.5px] text-ink-2">
              {count > 0 ? (
                <>
                  <b
                    className={`font-[650] tabular-nums transition-colors duration-500 ${
                      countFlash ? "text-live" : "text-ink"
                    }`}
                  >
                    {countFormat.format(count)}
                  </b>{" "}
                  {count === 1 ? "student is going" : "students are going"}
                </>
              ) : (
                zeroCountText
              )}
            </p>
          </section>

          {club && (
            <section aria-labelledby="event-host" className="mt-11">
              <SectionHead id="event-host" title="Hosted by" />
              <Rows>
                <Row
                  to={`/community/clubs/${club._id}`}
                  lead={<LogoTile src={club.logo} name={club.clubName} />}
                  title={club.clubName}
                  meta="View club"
                />
              </Rows>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
