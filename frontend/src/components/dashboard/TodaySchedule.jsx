import { CalendarClock } from "lucide-react";
import { Section, Empty } from "./Section";
import Row, { RowList } from "./Row";
import { formatTime } from "./format";

const typeStyle = {
  class: { label: "Class", tick: "bg-sky-400", badge: "text-sky-700 bg-sky-50" },
  event: { label: "Event", tick: "bg-violet-400", badge: "text-violet-700 bg-violet-50" },
  drive: { label: "Placement", tick: "bg-emerald-400", badge: "text-emerald-700 bg-emerald-50" },
};

const TimeCell = ({ item }) => {
  if (item.isOngoing)
    return <span className="text-xs font-semibold text-emerald-600">Ongoing</span>;
  if (!item.hasTime)
    return <span className="text-[11px] font-medium text-gray-400">Time TBA</span>;
  return (
    <>
      <span className="block text-xs font-semibold text-gray-900 tabular-nums">
        {formatTime(item.startAt)}
      </span>
      {item.endAt && (
        <span className="block text-[11px] text-gray-400 tabular-nums">
          {formatTime(item.endAt)}
        </span>
      )}
    </>
  );
};

const TodaySchedule = ({ schedule = [], classroomId }) => (
  <Section
    title="Today's Schedule"
    icon={CalendarClock}
    variant="primary"
    linkTo={classroomId ? `/academics/classroom/${classroomId}` : undefined}
    linkLabel="Timetable"
    footer={
      !classroomId && (
        <p className="text-[11px] text-gray-400">
          No classroom assigned yet — class periods will appear once your class rep sets it up.
        </p>
      )
    }
  >
    {schedule.length > 0 ? (
      <RowList>
        {schedule.map((item) => {
          const style = typeStyle[item.type] || typeStyle.class;
          const meta = [item.location, item.subtitle].filter(Boolean).join(" · ");
          return (
            <li key={item.id}>
              <Row url={item.url}>
                <div className="w-16 flex-shrink-0">
                  <TimeCell item={item} />
                </div>
                <span className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${style.tick}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  {meta && <p className="text-xs text-gray-500 truncate">{meta}</p>}
                </div>
                <span
                  className={`hidden sm:inline text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${style.badge}`}
                >
                  {style.label}
                </span>
              </Row>
            </li>
          );
        })}
      </RowList>
    ) : (
      <Empty message="Nothing scheduled today." />
    )}
  </Section>
);

export default TodaySchedule;
