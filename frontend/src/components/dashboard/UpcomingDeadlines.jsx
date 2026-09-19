import { BookOpen } from "lucide-react";
import { Section, Empty } from "./Section";
import Row, { RowList } from "./Row";
import { describeDue } from "./format";

const UpcomingDeadlines = ({ deadlines = [], classroomId }) => (
  <Section
    title="Upcoming Deadlines"
    icon={BookOpen}
    linkTo={classroomId ? `/academics/classroom/${classroomId}` : undefined}
    linkLabel="Classroom"
  >
    {deadlines.length > 0 ? (
      <RowList>
        {deadlines.map((dl) => {
          const due = describeDue(dl.dueDate);
          const meta = [dl.subject, dl.type?.replace(/_/g, " ")]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={dl.id}>
              <Row
                url={dl.url}
                trailing={
                  due && (
                    <span className={`text-xs font-semibold flex-shrink-0 ${due.color}`}>
                      {due.label}
                    </span>
                  )
                }
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{dl.title}</p>
                  {meta && (
                    <p className="text-xs text-gray-500 truncate capitalize">{meta}</p>
                  )}
                </div>
              </Row>
            </li>
          );
        })}
      </RowList>
    ) : (
      <Empty
        message={
          classroomId ? "No upcoming academic deadlines." : "No classroom assigned yet."
        }
      />
    )}
  </Section>
);

export default UpcomingDeadlines;
