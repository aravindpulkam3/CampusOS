import { DateTile, Row, Rows, SectionHead } from "../common/ui";
import { daysFromToday, formatClock } from "../../utils/formatDate";
import { describeDue } from "./format";

const ROWS = 3;

// "minor_exam" → "Minor exam"
const typeLabel = (type) => {
  const words = (type || "").replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const UpcomingDeadlines = ({ deadlines = [], classroomId }) => {
  // Three rows, or more when more than three are due by tomorrow: nothing that
  // close is left behind the link.
  const dueByTomorrow = deadlines.filter((dl) => daysFromToday(dl.dueDate) <= 1).length;
  const rows = deadlines.slice(0, Math.max(ROWS, dueByTomorrow));

  return (
    <section className="min-w-0">
      <SectionHead
        title="Due soon"
        linkTo={classroomId ? `/academics/classroom/${classroomId}` : undefined}
        linkLabel="All deadlines"
      />
      {rows.length > 0 ? (
        <Rows>
          {rows.map((dl) => {
            const due = describeDue(dl.dueDate);
            return (
              <Row
                key={dl.id}
                to={dl.url}
                lead={<DateTile date={dl.dueDate} />}
                title={dl.title}
                meta={[formatClock(dl.dueDate), dl.subject || typeLabel(dl.type)]
                  .filter(Boolean)
                  .join(", ")}
                end={due.label}
                endTone={due.tone}
              />
            );
          })}
        </Rows>
      ) : (
        <p className="py-1.5 text-[14.5px] text-ink-2">
          {classroomId ? "No upcoming academic deadlines." : "Deadlines from your classroom will appear here."}
        </p>
      )}
    </section>
  );
};

export default UpcomingDeadlines;
