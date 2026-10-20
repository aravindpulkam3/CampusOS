import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { Rows, SectionHead, btn, focusRing, note, tone } from "../common/ui";
import { EventPicture, EventRow, closesNote, eventPath } from "../events/eventBits";
import { describeWhen } from "../../utils/formatDate";
import { eventStanding } from "../../pages/events/eventDates";

const ROWS = 3;

// The nearest event, large. The whole block opens the event; registering
// happens on its page.
const Featured = ({ event, user, now }) => {
  const { going, live, open, canRegister, closes } = eventStanding(event, user, now);
  const status = going
    ? { text: "You're going", tone: tone.live }
    : canRegister
      ? closes && closesNote(closes)
      : !open && !live && { text: "Registration closed", tone: "text-ink-3" };

  return (
    <Link
      to={eventPath(event)}
      className={`group mb-5 mt-1.5 grid items-center gap-[18px] rounded-2xl sm:grid-cols-[300px_minmax(0,1fr)] sm:gap-7 ${focusRing}`}
    >
      <EventPicture event={event} lifted />
      <div className="min-w-0">
        <p className={`text-[13.5px] ${live ? tone.live : "text-ink-2"}`}>
          {live ? "Happening now" : describeWhen(event.startDateTime)}
          <span className="font-normal text-ink-2"> at {event.venue}</span>
        </p>
        <h3 className="mt-1.5 break-words text-[25px] font-[680] leading-[1.15] tracking-[-0.038em] text-ink decoration-ink/25 underline-offset-4 group-hover:underline">
          {event.eventName}
        </h3>
        {event.organizerClub?.clubName && (
          <p className="mt-1.5 text-[14.5px] text-ink-2">Hosted by {event.organizerClub.clubName}</p>
        )}
        <p className="mt-[22px] flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[13.5px]">
          <span className={btn}>{canRegister ? "Register" : "View event"}</span>
          {status && <span className={status.tone}>{status.text}</span>}
        </p>
      </div>
    </Link>
  );
};

// The next few events on campus, nearest first. `events` is null when the
// request for them failed; the rest of the dashboard does not depend on it.
const CampusEvents = ({ events }) => {
  const { user } = useAuth();
  const now = new Date();
  const [first, ...rest] = events || [];

  return (
    <section className="min-w-0">
      <SectionHead title="Coming up on campus" linkTo="/community/events" linkLabel="All events" />
      {first ? (
        <>
          <Featured event={first} user={user} now={now} />
          {rest.length > 0 && (
            <Rows>
              {rest.slice(0, ROWS).map((event) => (
                <EventRow key={event._id} event={event} user={user} now={now} />
              ))}
            </Rows>
          )}
        </>
      ) : (
        <p className={note}>
          {events ? "No events are coming up right now." : "Events could not be loaded."}
        </p>
      )}
    </section>
  );
};

export default CampusEvents;
