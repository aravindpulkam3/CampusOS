import { Link } from "react-router-dom";
import { Clock, MapPin, User, GraduationCap } from "lucide-react";
import { Section, Empty } from "./Section";
import { formatTime } from "./format";

const typeStyle = {
  class: { accent: "border-l-blue-400", badge: null },
  event: {
    accent: "border-l-violet-400",
    badge: { label: "Event", className: "text-violet-600 bg-violet-50" },
  },
  drive: {
    accent: "border-l-emerald-400",
    badge: { label: "Placement", className: "text-emerald-700 bg-emerald-50" },
  },
};

const ScheduleRow = ({ item }) => {
  const style = typeStyle[item.type] || typeStyle.class;

  const row = (
    <div
      className={`flex items-center gap-3 p-3 border border-gray-100 rounded-xl border-l-4 ${style.accent} ${
        item.url ? "hover:border-gray-300 transition-colors" : ""
      }`}
    >
      <div className="w-16 flex-shrink-0 text-center">
        {item.isOngoing ? (
          // An event that began before today must not advertise yesterday's
          // clock time as if it were today's start.
          <p className="text-xs font-bold text-emerald-600">Ongoing</p>
        ) : (
          <>
            <p className="text-xs font-bold text-gray-900 tabular-nums">
              {formatTime(item.startAt)}
            </p>
            {item.endAt && (
              <p className="text-xs text-gray-400 tabular-nums">
                {formatTime(item.endAt)}
              </p>
            )}
          </>
        )}
      </div>

      <div className="w-px self-stretch bg-gray-100 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.subtitle && (
            <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
              <User size={9} /> {item.subtitle}
            </span>
          )}
          {item.location && (
            <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
              <MapPin size={9} /> {item.location}
            </span>
          )}
          {style.badge && (
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${style.badge.className}`}
            >
              {style.badge.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return item.url ? (
    <Link to={item.url} className="block">
      {row}
    </Link>
  ) : (
    row
  );
};

const TodaySchedule = ({ schedule = [], classroomId }) => (
  <Section
    title="Today's Schedule"
    icon={Clock}
    linkTo={classroomId ? `/academics/classroom/${classroomId}` : undefined}
    linkLabel="Timetable"
  >
    {schedule.length > 0 ? (
      <div className="space-y-2">
        {schedule.map((item) => (
          <ScheduleRow key={item.id} item={item} />
        ))}
      </div>
    ) : (
      <Empty message="Nothing scheduled today." />
    )}

    {/* Classroom is only ONE of three schedule sources — a student without one
        can still have a registered event or an OA today, so this is an inline
        note rather than a replacement for the whole section. */}
    {!classroomId && (
      <div className="flex items-start gap-2 mt-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl">
        <GraduationCap size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-500">
          No classroom assigned yet — class periods won't appear here. Your Class
          Rep or Admin will set this up.
        </p>
      </div>
    )}
  </Section>
);

export default TodaySchedule;
