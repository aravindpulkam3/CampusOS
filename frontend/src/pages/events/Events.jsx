import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { getAllEvents, registerForEvent } from "../../api/event.api";
import useAuth from "../../hooks/useAuth";
import useDebounce from "../../hooks/useDebounce";
import { EVENT_CATEGORIES } from "../../constants/categories";
import {
  Chips,
  LoadError,
  LoadMore,
  PageTitle,
  Rows,
  SearchField,
  SectionHead,
  btn,
  btnGhostSm,
  focusRing,
  note,
  tone,
} from "../../components/common/ui";
import { EventPicture, EventRow, closesNote, eventPath } from "../../components/events/eventBits";
import { daysFromToday, formatClock } from "../../utils/formatDate";
import { eventStanding, formatEventDay } from "./eventDates";

const CATEGORIES = ["All", ...EVENT_CATEGORIES];

const titleLink = `rounded decoration-ink/25 underline-offset-4 after:absolute after:inset-0 group-hover:underline ${focusRing}`;

// Where the student stands with an event, and the one thing they can do about
// it from the list. Rendered above the card's stretched link, so the button is
// its own target.
const Standing = ({ event, user, now, large = false, pending, error, onRegister }) => {
  const { going, open, eligible, canRegister, closes } = eventStanding(event, user, now);
  const closing = canRegister && closes && closesNote(closes);

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13.5px]">
        {going ? (
          <span className={`inline-flex items-center gap-1.5 ${tone.live}`}>
            <Check size={15} strokeWidth={2.4} aria-hidden="true" /> You're going
          </span>
        ) : canRegister ? (
          <button
            type="button"
            onClick={() => onRegister(event._id)}
            disabled={pending}
            className={`relative z-10 ${large ? btn : btnGhostSm}`}
          >
            {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {pending ? "Registering…" : "Register"}
          </button>
        ) : (
          <span className="text-ink-3">
            {open && !eligible ? "Not open to your branch or year" : "Registration closed"}
          </span>
        )}
        {closing && (large || closing.soon) && <span className={closing.tone}>{closing.text}</span>}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-urgent">
          {error}
        </p>
      )}
    </>
  );
};

// The nearest event, given the top of the page.
const Lead = ({ event, user, now, ...standing }) => {
  const { live } = eventStanding(event, user, now);
  const start = new Date(event.startDateTime);
  const facts = [
    ["Where", event.venue],
    ["Host", event.organizerClub?.clubName],
  ].filter(([, value]) => value);

  return (
    <article className="group relative mt-9 grid items-center gap-[22px] lg:grid-cols-[minmax(0,1.22fr)_minmax(0,1fr)] lg:gap-12">
      <EventPicture event={event} className="aspect-[16/10] rounded-[22px]" lifted />
      <div className="min-w-0">
        <p className={`text-[14.5px] ${live ? tone.live : "text-ink-2"}`}>
          {live
            ? `Happening now, until ${formatClock(event.endDateTime)}`
            : `${start.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}, ${formatClock(start)}`}
        </p>
        <h2 className="mt-2 break-words text-[30px] font-bold leading-[1.06] tracking-[-0.045em] text-ink lg:text-[38px]">
          <Link to={eventPath(event)} className={titleLink}>
            {event.eventName}
          </Link>
        </h2>
        {event.description && (
          <p className="mt-3 line-clamp-3 max-w-[44ch] text-base leading-normal text-ink-2">
            {event.description}
          </p>
        )}
        {facts.length > 0 && (
          <dl className="mt-5 grid gap-1 text-[14.5px]">
            {facts.map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <dt className="w-[52px] flex-none text-ink-3">{label}</dt>
                <dd className="min-w-0 break-words font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-[26px]">
          <Standing event={event} user={user} now={now} large {...standing} />
        </div>
      </div>
    </article>
  );
};

const EventCard = ({ event, user, now, ...standing }) => {
  const { live } = eventStanding(event, user, now);
  return (
    <li className="group relative min-w-0">
      <EventPicture event={event} className="aspect-[3/2] rounded-2xl" />
      <p className="mt-3.5 flex justify-between gap-3 text-[13.5px] text-ink-2">
        <span className={live ? tone.live : ""}>
          {live
            ? "Happening now"
            : `${formatEventDay(event.startDateTime)}, ${formatClock(event.startDateTime)}`}
        </span>
        <span className="flex-none text-ink-3">{event.category}</span>
      </p>
      <h3 className="mt-1 break-words text-[17.5px] font-[650] leading-tight tracking-[-0.028em] text-ink">
        <Link to={eventPath(event)} className={titleLink}>
          {event.eventName}
        </Link>
      </h3>
      <p className="mt-0.5 truncate text-[13.5px] text-ink-2">
        {[event.organizerClub?.clubName, event.venue].filter(Boolean).join(", ")}
      </p>
      <div className="mt-3.5">
        <Standing event={event} user={user} now={now} {...standing} />
      </div>
    </li>
  );
};

const CardSkeleton = () => (
  <div className="animate-pulse">
    <div className="aspect-[3/2] rounded-2xl bg-soft" />
    <div className="mt-4 h-3 w-1/3 rounded bg-soft" />
    <div className="mt-2.5 h-4 w-3/4 rounded bg-soft" />
    <div className="mt-2.5 h-3 w-1/2 rounded bg-soft" />
  </div>
);

export default function Events() {
  const { user, setUser } = useAuth();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [activeCategory, setActiveCategory] = useState("All");
  const [feedItems, setFeedItems] = useState([]);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const requestRef = useRef(0);
  const searchRef = useRef(search);

  // Events with a registration in flight: their button stays disabled until
  // it settles. A refusal is shown on that event's card.
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [registerError, setRegisterError] = useState(null); // { id, message }

  const invalidateFeed = () => {
    requestRef.current += 1;
    setFeedItems([]);
    setOffset(0);
    setHasMore(false);
    setFeedLoading(true);
    setLoadMoreLoading(false);
    setFeedError(false);
  };

  const handleRegister = async (eventId) => {
    if (pendingIds.has(eventId)) return;
    setPendingIds((prev) => new Set(prev).add(eventId));
    setRegisterError(null);
    // The server registers atomically; mirror the registration into the cached
    // user, which is what every page reads "You're going" from.
    const markRegistered = () =>
      setUser((prev) =>
        prev && !prev.registeredEvents?.some((e) => String(e?._id ?? e) === eventId)
          ? { ...prev, registeredEvents: [...(prev.registeredEvents || []), eventId] }
          : prev,
      );
    try {
      await registerForEvent(eventId);
      markRegistered();
    } catch (err) {
      // 409: already registered, from another tab or device.
      if (err.response?.status === 409) markRegistered();
      else
        setRegisterError({
          id: eventId,
          message:
            err.response?.data?.message || "Couldn't register. Check your connection and try again.",
        });
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const fetchFeed = useCallback(
    async (currentOffset = 0, append = false) => {
      if (debouncedSearch !== searchRef.current) return;
      const request = ++requestRef.current;
      try {
        setFeedError(false);
        if (append) setLoadMoreLoading(true);
        else setFeedLoading(true);

        const res = await getAllEvents({
          category: activeCategory,
          search: debouncedSearch,
          offset: currentOffset,
        });
        if (request !== requestRef.current) return;

        const {
          events = [],
          hasMore: nextHasMore,
          nextOffset,
        } = res?.data?.data || {};

        setFeedItems((prev) => (append ? [...prev, ...events] : events));
        setHasMore(nextHasMore);
        setOffset(nextOffset);
      } catch (err) {
        if (request === requestRef.current) {
          console.error("Events sync error:", err);
          setFeedError(true);
        }
      } finally {
        if (request === requestRef.current) {
          setFeedLoading(false);
          setLoadMoreLoading(false);
        }
      }
    },
    [activeCategory, debouncedSearch],
  );

  useEffect(() => {
    invalidateFeed();
    fetchFeed(0, false);
    return () => { requestRef.current += 1; };
  }, [activeCategory, debouncedSearch, fetchFeed]);

  const handleLoadMore = () => {
    if (!loadMoreLoading && hasMore) {
      fetchFeed(offset, true);
    }
  };

  const retryFeed = () => fetchFeed(offset, offset > 0);

  const handleSearch = (value) => {
    searchRef.current = value;
    invalidateFeed();
    setSearch(value);
  };

  // The server sends what is on now, then what is coming (nearest first), then
  // what has ended (latest first). The page keeps that order and only decides
  // how each stretch is shown.
  const now = new Date();
  const current = feedItems.filter((event) => new Date(event.endDateTime) >= now);
  const past = feedItems.filter((event) => new Date(event.endDateTime) < now);
  const lead = !debouncedSearch.trim() ? current[0] : undefined;
  const rest = lead ? current.slice(1) : current;
  const thisWeek = rest.filter((event) => daysFromToday(event.startDateTime) <= 6);
  const later = rest.filter((event) => daysFromToday(event.startDateTime) > 6);

  const standingFor = (event) => ({
    pending: pendingIds.has(event._id),
    error: registerError?.id === event._id ? registerError.message : null,
    onRegister: handleRegister,
  });

  return (
    <div className="pb-10 lg:pb-20">
      <PageTitle title="Events" />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <Chips
          label="Category"
          options={CATEGORIES}
          value={activeCategory}
          onChange={(cat) => {
            if (cat !== activeCategory) {
              invalidateFeed();
              setActiveCategory(cat);
            }
          }}
        />
        <SearchField
          value={search}
          onChange={handleSearch}
          label="Search events"
          placeholder="Search events"
        />
      </div>

      {feedLoading ? (
        <div className="mt-11 grid grid-cols-1 gap-x-7 gap-y-11 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : feedError && feedItems.length === 0 ? (
        <div className="mt-9">
          <LoadError onRetry={retryFeed}>Could not load events.</LoadError>
        </div>
      ) : feedItems.length === 0 ? (
        <p className={`mt-9 ${note}`}>
          {debouncedSearch.trim()
            ? `No events match "${debouncedSearch.trim()}".`
            : activeCategory === "All"
              ? "There are no events yet."
              : `There are no ${activeCategory.toLowerCase()} events yet.`}
        </p>
      ) : (
        <>
          {lead && <Lead event={lead} user={user} now={now} {...standingFor(lead)} />}

          {thisWeek.length > 0 && (
            <section className="mt-12 lg:mt-[72px]">
              <SectionHead title={lead ? "Also this week" : "This week"} />
              <ul className="mt-[18px] grid grid-cols-1 gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-11">
                {thisWeek.map((event) => (
                  <EventCard key={event._id} event={event} user={user} now={now} {...standingFor(event)} />
                ))}
              </ul>
            </section>
          )}

          {later.length > 0 && (
            <section className="mt-12 lg:mt-[72px]">
              <SectionHead title="Later" />
              <Rows>
                {later.map((event) => (
                  <EventRow key={event._id} event={event} user={user} now={now} />
                ))}
              </Rows>
            </section>
          )}

          {past.length > 0 && (
            <section className="mt-12 lg:mt-[72px]">
              <SectionHead title="Past events" />
              <Rows>
                {past.map((event) => (
                  <EventRow key={event._id} event={event} user={user} now={now} past />
                ))}
              </Rows>
            </section>
          )}

          {feedError && (
            <div className="mt-6">
              <LoadError>Could not load more events.</LoadError>
            </div>
          )}
          {hasMore && (
            <LoadMore onClick={feedError ? retryFeed : handleLoadMore} loading={loadMoreLoading} failed={feedError}>
              Load more events
            </LoadMore>
          )}
        </>
      )}
    </div>
  );
}
