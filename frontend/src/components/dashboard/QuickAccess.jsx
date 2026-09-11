import { Link } from "react-router-dom";
import { GraduationCap, Users, Briefcase, Trophy } from "lucide-react";

// Navigation shortcuts, not dashboard information — deliberately compact and at
// the bottom so they never compete with Action Required or the schedule.
const QuickAccess = ({ classroomId }) => {
  const links = [
    {
      label: "Classroom",
      icon: GraduationCap,
      to: classroomId ? `/academics/classroom/${classroomId}` : "/profile",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Clubs",
      icon: Users,
      to: "/community/clubs",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "My Applications",
      icon: Briefcase,
      to: "/career/my-applications",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Competitive Prep",
      icon: Trophy,
      to: "/academics/competitive",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {links.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className="flex items-center gap-2.5 px-3 py-2.5 bg-white border border-gray-100 rounded-xl hover:border-gray-300 transition-all group"
        >
          <div
            className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}
          >
            <item.icon size={13} className={item.color} />
          </div>
          <p className="text-xs font-medium text-gray-700 truncate">
            {item.label}
          </p>
        </Link>
      ))}
    </div>
  );
};

export default QuickAccess;
