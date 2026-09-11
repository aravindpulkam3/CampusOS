import { BookOpen } from "lucide-react";
import { Section, Empty } from "./Section";
import { describeDue } from "./format";

// Academic only — placement application deadlines belong under Eligible Drives
// and Action Required, never mixed in here.
const typeColor = {
  assignment: "text-blue-700 bg-blue-50",
  quiz: "text-purple-700 bg-purple-50",
  minor_exam: "text-red-700 bg-red-50",
  lab_exam: "text-orange-700 bg-orange-50",
  semester_exam: "text-red-700 bg-red-50",
  project: "text-amber-700 bg-amber-50",
  general: "text-gray-700 bg-gray-100",
};

const UpcomingDeadlines = ({ deadlines = [], classroomId }) => (
  <Section
    title="Upcoming Deadlines"
    icon={BookOpen}
    linkTo={classroomId ? `/academics/classroom/${classroomId}` : undefined}
    linkLabel="Classroom"
  >
    {deadlines.length > 0 ? (
      <div className="space-y-2">
        {deadlines.map((dl) => {
          const due = describeDue(dl.dueDate);
          return (
            <div
              key={dl.id}
              className="flex items-center gap-3 p-3 bg-gray-50/80 border border-gray-100 rounded-xl"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  due?.label === "Today"
                    ? "bg-red-400"
                    : due?.label === "Tomorrow"
                      ? "bg-amber-400"
                      : "bg-gray-300"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {dl.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                      typeColor[dl.type] || typeColor.general
                    }`}
                  >
                    {dl.type?.replace(/_/g, " ")}
                  </span>
                  {/* Resolved server-side from the curriculum — never a raw id */}
                  {dl.subject && (
                    <span className="text-xs text-gray-400 truncate">
                      {dl.subject}
                    </span>
                  )}
                </div>
              </div>
              {due && (
                <span
                  className={`text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded-lg ${due.bg} ${due.color}`}
                >
                  {due.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <Empty
        message={
          classroomId
            ? "No upcoming academic deadlines."
            : "No classroom assigned yet."
        }
      />
    )}
  </Section>
);

export default UpcomingDeadlines;
