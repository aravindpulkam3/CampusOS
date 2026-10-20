import useImageOk from "../../hooks/useImageOk";
import { DateTile, Row, tone } from "../common/ui";
import {
  daysFromToday,
  describeDay,
  describeWhen,
  formatClock,
  formatShortDate,
} from "../../utils/formatDate";
import { eventStanding } from "../../pages/events/eventDates";

// How an event is shown wherever it appears: the dashboard, the events list,
// a club's page, the community sidebar.

export const eventPath = (event) => `/community/events/${event._id}`;

// When registration closes, in the closing-soon colour once that is today or tomorrow.
export const closesNote = (closes) => {
  const days = daysFromToday(closes);
  if (days === 0) return { text: `Closes ${formatClock(closes)} today`, soon: true, tone: tone.warn };
  if (days === 1) return { text: `Closes tomorrow, ${formatClock(closes)}`, soon: true, tone: tone.warn };
  return { text: `Closes ${formatShortDate(closes)}`, soon: false, tone: "text-ink-2" };
};

// The event's own picture; `className` gives it its shape. Without a picture,
// the date stands in for it.
export const EventPicture = ({ event, className = "aspect-[4/3] rounded-2xl", lifted = false }) => {
  const [showBanner, onBannerError] = useImageOk(event.banner);
  if (showBanner)
    return (
      <img
        src={event.banner}
        alt=""
        loading="lazy"
        onError={onBannerError}
        className={`w-full object-cover ${className} ${
          lifted ? "shadow-[0_1px_2px_rgb(14_15_17/0.06),0_24px_44px_-28px_rgb(14_15_17/0.45)]" : ""
        }`}
      />
    );

  const start = new Date(event.startDateTime);
  return (
    <div
      aria-hidden="true"
      className={`grid w-full content-center justify-items-center bg-soft ring-1 ring-inset ring-line ${className}`}
    >
      <span className="text-[13.5px] font-medium text-ink-2">
        {start.toLocaleDateString("en-IN", { month: "long" })}
      </span>
      <span className="text-[64px] font-[680] leading-none tracking-[-0.05em] text-ink">
        {start.getDate()}
      </span>
      <span className="mt-1 text-[13.5px] font-medium text-ink-2">
        {start.toLocaleDateString("en-IN", { weekday: "long" })}
      </span>
    </div>
  );
};

export const EventThumb = ({ event, muted = false }) => {
  const [showBanner, onBannerError] = useImageOk(event.banner);
  return showBanner ? (
    <img
      src={event.banner}
      alt=""
      loading="lazy"
      onError={onBannerError}
      className={`size-11 flex-none rounded-[11px] object-cover ${muted ? "opacity-70" : ""}`}
    />
  ) : (
    <DateTile date={event.startDateTime} large />
  );
};

const closesWord = (closes) => {
  const days = daysFromToday(closes);
  return days === 0 ? "today" : days === 1 ? "tomorrow" : formatShortDate(closes);
};

// One event as a list row. `past` is for events that have ended; `registration`
// adds where registration stands to the detail line (a club's own event list);
// `compact` is for narrow columns, where the day is shown without the time.
export const EventRow = ({ event, user, now, past = false, registration = false, compact = false }) => {
  const { going, live, cancelled, open, closes } = eventStanding(event, user, now);

  let end = compact ? describeDay(event.startDateTime) : describeWhen(event.startDateTime);
  let endTone;
  if (cancelled) [end, endTone] = ["Cancelled", "urgent"];
  else if (past) end = formatShortDate(event.startDateTime);
  else if (live) [end, endTone] = ["Happening now", "live"];
  else if (going) [end, endTone] = [compact ? "You're going" : `You're going, ${describeDay(event.startDateTime)}`, "live"];

  const registrationNote =
    registration && !past && !cancelled && !going && !live
      ? open
        ? closes && `registration closes ${closesWord(closes)}`
        : "registration closed"
      : null;

  return (
    <Row
      to={eventPath(event)}
      lead={<EventThumb event={event} muted={past} />}
      title={event.eventName}
      meta={[event.organizerClub?.clubName, event.venue, registrationNote].filter(Boolean).join(", ")}
      end={end}
      endTone={endTone}
      muted={past || cancelled}
    />
  );
};
