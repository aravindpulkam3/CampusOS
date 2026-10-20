import { Link } from "react-router-dom";
import useNow from "../../hooks/useNow";
import { daysFromToday, formatClock, formatClockRange, formatShortDate } from "../../utils/formatDate";
import { focusRing } from "../common/ui";

const MAX_PER_ROW = 5;

// Where an item stands at `now`. Drive rounds have no end time: they are never
// "now" and stay listed for the rest of the day.
const stateOf = (item, now) => {
  const start = new Date(item.startAt).getTime();
  const end = item.endAt ? new Date(item.endAt).getTime() : null;
  if (end !== null && end <= now) return "past";
  if (end !== null && start <= now) return "now";
  return "next";
};

const timeLabel = (item, current, now) => {
  if (current) {
    const end = new Date(item.endAt);
    const mins = Math.ceil((end - now) / 60000);
    if (mins < 60) return `Now, ${mins} min left`;
    return `Now, until ${daysFromToday(end) === 0 ? formatClock(end) : formatShortDate(end)}`;
  }
  if (!item.hasTime) return "Time TBA";
  return item.endAt ? formatClockRange(item.startAt, item.endAt) : formatClock(item.startAt);
};

const Slot = ({ item, now, edge }) => {
  const current = stateOf(item, now) === "now";
  const meta = [item.location, item.subtitle].filter(Boolean).join(", ");
  const start = new Date(item.startAt).getTime();
  const done = current ? ((now - start) / (new Date(item.endAt).getTime() - start)) * 100 : 0;

  return (
    <li className={`border-line ${edge}`}>
      <Link
        to={item.url}
        className={`block h-full px-[18px] py-4 transition-colors hover:bg-ink/[0.025] lg:px-6 lg:pb-6 lg:pt-[22px] ${focusRing} focus-visible:ring-inset`}
      >
        <p
          className={`flex items-center gap-2 text-[13px] ${
            current ? "font-semibold text-live" : "font-medium text-ink-3"
          }`}
        >
          {current && (
            <span aria-hidden="true" className="size-[7px] flex-none rounded-full bg-live ring-4 ring-live/15" />
          )}
          {timeLabel(item, current, now)}
        </p>
        <p className="mt-1.5 line-clamp-3 text-[15.5px] font-[620] leading-[1.3] tracking-[-0.02em] text-ink lg:mt-7">
          {item.title}
        </p>
        {meta && <p className="mt-[3px] truncate text-[13.5px] text-ink-2">{meta}</p>}
        {current && (
          <div aria-hidden="true" className="mt-3.5 h-[3px] overflow-hidden rounded-sm bg-line">
            <div className="h-full bg-ink" style={{ width: `${done}%` }} />
          </div>
        )}
      </Link>
    </li>
  );
};

// What is left of today: classes, events the student registered for and drive
// rounds they have reached, in one strip. Finished items drop off.
const TodaySchedule = ({ schedule = [], classroomId }) => {
  const now = useNow();
  const left = schedule.filter((item) => stateOf(item, now) !== "past");
  // Up to five across; a longer day wraps into rows of equal length (7 → 4 + 3).
  const perRow = Math.ceil(left.length / Math.ceil(left.length / MAX_PER_ROW)) || 1;

  return (
    <section aria-label="Rest of your day" className="mt-8">
      <div className="overflow-hidden rounded-panel border border-line-2 bg-white/[0.78] shadow-panel">
        {left.length > 0 ? (
          <ol
            className="grid grid-cols-1 lg:grid-cols-[repeat(var(--per-row),minmax(0,1fr))]"
            style={{ "--per-row": perRow }}
          >
            {left.map((item, i) => (
              <Slot
                key={item.id}
                item={item}
                now={now}
                edge={`${i > 0 ? "max-lg:border-t" : ""} ${i % perRow ? "lg:border-l" : ""} ${
                  i >= perRow ? "lg:border-t" : ""
                }`}
              />
            ))}
            {/* Empty cells that finish the last row, so the dividing lines run the full width */}
            {Array.from({ length: (perRow - (left.length % perRow)) % perRow }).map((_, i) => (
              <li key={i} aria-hidden="true" className="border-l border-t border-line max-lg:hidden" />
            ))}
          </ol>
        ) : (
          <p className="px-[18px] py-5 text-[14.5px] text-ink-2 lg:px-6">
            {schedule.length > 0 ? "That's everything for today." : "Nothing scheduled today."}
          </p>
        )}
      </div>
      {!classroomId && (
        <p className="mt-3 text-[13.5px] text-ink-3">
          No classroom assigned yet. Class periods will appear once your class rep sets it up.
        </p>
      )}
    </section>
  );
};

export default TodaySchedule;
