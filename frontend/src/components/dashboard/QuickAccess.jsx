import { Link } from "react-router-dom";
import { GraduationCap, Users, Briefcase, Trophy } from "lucide-react";

// Navigation shortcuts, not dashboard content — compact pills at the bottom.
const QuickAccess = ({ classroomId }) => {
  const links = [
    {
      label: "Classroom",
      icon: GraduationCap,
      to: classroomId ? `/academics/classroom/${classroomId}` : "/profile",
    },
    { label: "Clubs", icon: Users, to: "/community/clubs" },
    { label: "My Applications", icon: Briefcase, to: "/career/my-applications" },
    { label: "Competitive Prep", icon: Trophy, to: "/academics/competitive" },
  ];

  return (
    <nav aria-label="Quick access" className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
      {links.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className="flex items-center gap-2 h-9 px-3 bg-white border border-gray-200/70 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 transition-colors"
        >
          <item.icon size={14} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default QuickAccess;
