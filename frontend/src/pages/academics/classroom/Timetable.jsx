import { useState } from "react";
import { Plus } from "lucide-react";
import { Chips, btnGhostSm, focusRing, note, panel, tone } from "../../../components/common/ui";
import { formatClock, formatClockRange } from "../../../utils/formatDate";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Sunday is drawn only while the timetable has a class on it, so a Monday to
// Saturday week keeps its six columns.
const daysShown = (periods) =>
  periods.some((p) => p.day === "Sunday") ? DAYS : DAYS.slice(0, 6);

// ─── time helpers — storage is minutes-since-midnight, inputs/display are strings ──
export const minutesToInputTime = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const timeInputToMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const atMinutes = (m) => new Date(2000, 0, 1, Math.floor(m / 60), m % 60);
// "9:00 am"
const minutesToLabel = (m) => formatClock(atMinutes(m));
// "9:00 – 9:55 am"
const rangeLabel = (period) => formatClockRange(atMinutes(period.startTime), atMinutes(period.endTime));
// "9 am", for the hour lines of the week grid
const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h % 24 < 12 ? "am" : "pm"}`;

// The week grid draws time to scale: this many pixels to the hour, with a
// small gap under each period so back-to-back classes read as two blocks.
const HOUR = 84;
const GAP = 4;
const columnsFor = (days) =>
  days.length === 7
    ? "grid grid-cols-[64px_repeat(7,minmax(0,1fr))]"
    : "grid grid-cols-[64px_repeat(6,minmax(0,1fr))]";

// Today's name (null on a Sunday without classes), the minutes since
// midnight, and the dates of the week on show. On a Sunday without classes
// that is the week starting tomorrow.
const readClock = (now, days) => {
  const date = new Date(now);
  const index = (date.getDay() + 6) % 7; // Monday 0 … Sunday 6
  const today = days[index] ?? null;
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(date.getDate() + (today ? -index : 1));
  return {
    days,
    today,
    minutes: date.getHours() * 60 + date.getMinutes(),
    dates: days.map((_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return day.getDate();
    }),
  };
};

// Only today's periods can be over or under way; the rest of the week is ahead.
const stateOf = (period, clock) => {
  if (period.day !== clock.today) return "next";
  if (period.endTime <= clock.minutes) return "past";
  return period.startTime <= clock.minutes ? "now" : "next";
};

// One period in the week grid. How much it says depends on how tall it is:
// a short slot gets the subject alone, an hour adds the room, a lab adds the
// teacher. The class rep's blocks are buttons that open the period for editing.
const Block = ({ period, name, state, height, onEdit }) => {
  const when = rangeLabel(period);
  const roomy = height >= 65;
  const detail = [period.room, height >= 130 && period.faculty].filter(Boolean).join(", ");
  const full = [name, when, period.room, period.faculty].filter(Boolean).join(", ");

  const surface =
    state === "now" ? "bg-ink shadow-[0_14px_28px_-14px_rgb(14_15_17/0.6)]" : "bg-soft";
  const titleTone =
    state === "now" ? "font-semibold text-white" : state === "past" ? "font-medium text-ink-3" : "font-semibold text-ink";
  const detailTone = state === "now" ? "text-white/70" : state === "past" ? "text-ink-3" : "text-ink-2";

  // Wrapped, so a button keeps its text at the top like a plain block does.
  const body = (
    <span className="block w-full min-w-0">
      <span className="sr-only">
        {state === "now" ? "Now, " : ""}
        {when}:{" "}
      </span>
      <span
        className={`text-[13px] leading-[1.25] tracking-[-0.015em] ${titleTone} ${
          roomy ? "line-clamp-2" : "block truncate"
        }`}
      >
        {name}
      </span>
      {detail && height >= 48 && (
        <span
          className={`mt-0.5 text-[12.5px] leading-[1.3] ${detailTone} ${
            height >= 130 ? "line-clamp-2" : "block truncate"
          }`}
        >
          {detail}
        </span>
      )}
    </span>
  );
  const box = `flex size-full items-start overflow-hidden rounded-[11px] px-2.5 text-left ${
    height < 34 ? "py-1" : "py-2"
  } ${surface}`;

  return onEdit ? (
    <button
      type="button"
      onClick={() => onEdit(period)}
      title={`Edit: ${full}`}
      className={`${box} transition-shadow hover:ring-1 hover:ring-inset hover:ring-ink-3 ${focusRing}`}
    >
      {body}
    </button>
  ) : (
    <div title={full} className={box}>
      {body}
    </div>
  );
};

// The whole week, time to scale (lg and up).
const WeekGrid = ({ periods, nameOf, clock, onAdd, onEdit }) => {
  const from = Math.floor(Math.min(...periods.map((p) => p.startTime)) / 60);
  const to = Math.ceil(Math.max(...periods.map((p) => p.endTime)) / 60);
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const columns = columnsFor(clock.days);

  return (
    <div className={`pb-5 pr-5 pt-2 max-lg:hidden ${panel}`}>
      <div className={columns}>
        <span />
        {clock.days.map((day, i) => (
          <div key={day} className="flex items-baseline gap-1.5 pb-3.5 pl-3.5 pr-2 pt-4 text-[13.5px]">
            <span className={day === clock.today ? "font-semibold text-ink" : "text-ink-3"}>
              {day.slice(0, 3)}
            </span>
            <b className="text-[17px] font-[650] tracking-[-0.025em] text-ink">{clock.dates[i]}</b>
            {day === clock.today && (
              <span aria-hidden="true" className="ml-1 size-1.5 self-center rounded-full bg-live" />
            )}
            {onAdd && (
              <button
                type="button"
                onClick={() => onAdd(day)}
                aria-label={`Add a period on ${day}`}
                className={`-my-1 ml-auto grid size-7 flex-none place-items-center self-center rounded-lg text-ink-3 transition-colors hover:bg-soft hover:text-ink ${focusRing}`}
              >
                <Plus size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div
        className={`relative ${columns}`}
        style={{ height: (to - from) * HOUR, "--hour": `${HOUR}px` }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-16 right-0 border-b border-line bg-[repeating-linear-gradient(to_bottom,var(--color-line)_0_1px,transparent_1px_var(--hour))]"
        />
        <div aria-hidden="true" className="relative">
          {hours.map((hour, i) => (
            <span
              key={hour}
              className={`absolute right-4 whitespace-nowrap text-[12.5px] text-ink-3 ${
                i === 0 ? "-translate-y-0.5" : "-translate-y-1/2"
              }`}
              style={{ top: i * HOUR }}
            >
              {hourLabel(hour)}
            </span>
          ))}
        </div>
        {clock.days.map((day) => (
          <ol
            key={day}
            aria-label={day === clock.today ? `${day}, today` : day}
            className="relative"
          >
            {periods
              .filter((p) => p.day === day)
              .map((period) => {
                const height = ((period.endTime - period.startTime) * HOUR) / 60 - GAP;
                return (
                  <li
                    key={period._id}
                    className="absolute inset-x-1"
                    style={{ top: ((period.startTime - from * 60) * HOUR) / 60 + 3, height }}
                  >
                    <Block
                      period={period}
                      name={nameOf(period)}
                      state={stateOf(period, clock)}
                      height={height}
                      onEdit={onEdit}
                    />
                  </li>
                );
              })}
          </ol>
        ))}
      </div>
    </div>
  );
};

// One day at a time, as a list (below lg, where the week's columns do not fit).
const DayList = ({ periods, nameOf, clock, day, onDay, onEdit }) => {
  const list = periods.filter((p) => p.day === day);
  return (
    <div className="lg:hidden">
      <Chips
        label="Day"
        options={clock.days.map((d) => ({ value: d, label: d === clock.today ? "Today" : d.slice(0, 3) }))}
        value={day}
        onChange={onDay}
      />
      {list.length > 0 ? (
        <ol className="mt-2 divide-y divide-line">
          {list.map((period) => {
            const state = stateOf(period, clock);
            const past = state === "past";
            const detail = [period.room, period.faculty].filter(Boolean).join(", ");
            return (
              <li key={period._id} className="flex min-h-16 items-center gap-4 py-3">
                <span className="w-[70px] flex-none text-[13.5px] leading-[1.4]">
                  <span className={`block ${past ? "text-ink-3" : "font-semibold text-ink"}`}>
                    {minutesToLabel(period.startTime)}
                  </span>
                  <span className="block text-ink-3">
                    <span className="sr-only">to </span>
                    {minutesToLabel(period.endTime)}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[15px] leading-[1.35] tracking-[-0.018em] ${
                      past ? "font-medium text-ink-3" : "font-semibold text-ink"
                    }`}
                  >
                    {nameOf(period)}
                  </span>
                  {detail && (
                    <span className={`mt-px block truncate text-[13.5px] ${past ? "text-ink-3" : "text-ink-2"}`}>
                      {detail}
                    </span>
                  )}
                </span>
                {state === "now" && <span className={`flex-none text-[13.5px] ${tone.live}`}>Now</span>}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(period)}
                    aria-label={`Edit ${nameOf(period)}, ${rangeLabel(period)}`}
                    className={btnGhostSm}
                  >
                    Edit
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={`mt-2 ${note}`}>No classes on {day}.</p>
      )}
    </div>
  );
};

// The classroom's one current timetable: the whole week as a grid on a wide
// screen, one day at a time on a narrow one. Rows and hours come from the
// periods themselves, never from a fixed slot table. `onAdd(day)` and
// `onEdit(period)` are passed only to the class rep.
const Timetable = ({ periods, subjects, now, hasSemester, onAdd, onEdit }) => {
  const clock = readClock(now, daysShown(periods));
  const [day, setDay] = useState(clock.today || clock.days[0]);

  const subjectName = new Map(subjects.map((s) => [s._id, s.name]));
  const nameOf = (period) => subjectName.get(period.subject) || "Unknown subject";
  const sorted = [...periods].sort((a, b) => a.startTime - b.startTime);

  return (
    <section aria-labelledby="timetable-heading">
      <div className="mb-3 flex min-h-8 items-center gap-4">
        <h2 id="timetable-heading" className="text-[17px] font-[650] tracking-[-0.025em] text-ink">
          Timetable
        </h2>
        {onAdd && hasSemester && (
          <button type="button" onClick={() => onAdd(day)} className={`ml-auto ${btnGhostSm}`}>
            <Plus size={14} aria-hidden="true" /> Add period
          </button>
        )}
      </div>

      {!hasSemester ? (
        <p className={note}>The semester has not been started yet, so there is no timetable.</p>
      ) : sorted.length === 0 ? (
        <p className={note}>
          {onAdd ? "No periods yet. Add the first one to start the timetable." : "No timetable has been set yet."}
        </p>
      ) : (
        <>
          <WeekGrid periods={sorted} nameOf={nameOf} clock={clock} onAdd={onAdd} onEdit={onEdit} />
          <DayList periods={sorted} nameOf={nameOf} clock={clock} day={day} onDay={setDay} onEdit={onEdit} />
        </>
      )}
    </section>
  );
};

export default Timetable;
