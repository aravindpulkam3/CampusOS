import { NavLink, useLocation } from "react-router-dom";
import { useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Briefcase,
  ShieldCheck,
  UserCircle,
  GraduationCap,
  School,
  Trophy,
  MessageSquare,
  BarChart2,
  FileText,
  ListChecks,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";

const bottomNav = [
  { label: "Admin", path: "/admin", icon: ShieldCheck },
  { label: "Profile", path: "/profile", icon: UserCircle },
];

const Sidebar = ({ isOpen }) => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  // console.log("user in sidebar", user);

  // General check to see if the user's browser is currently inside a workspace sector
  const academicsActive = pathname.startsWith("/academics");
  const careerActive = pathname.startsWith("/career");

  const mainNav = useMemo(() => {
    return [
      {
        label: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
      },
      {
        label: "Community",
        path: "/community",
        icon: Users,
      },
      {
        label: "Academics",
        path: user?.classroom
          ? `/academics/classroom/${user.classroom}`
          : "/academics/competitive",
        icon: BookOpen,
        children: [
          {
            label: "Classroom",
            path: user?.classroom
              ? `/academics/classroom/${user.classroom}`
              : "/academics/classroom/unassigned",
            icon: School,
          },
          {
            label: "Competitive Prep",
            path: "/academics/competitive",
            icon: Trophy,
          },
        ],
      },
      // ─── CLEAN, SEPARATED TOP-LEVEL LINK ───
      {
        label: "Discussions",
        path: "/discussions",
        icon: MessageSquare,
      },
      {
        label: "Career",
        path: "/career",
        icon: Briefcase,
        children: [
          {
            label: "Overview",
            path: "/career",
            icon: BarChart2,
            exact: true,
          },
          {
            label: "Drives",
            path: "/career/drives",
            icon: ListChecks,
          },
          {
            label: "My Applications",
            path: "/career/my-applications",
            icon: FileText,
          },
        ],
      },
    ];
  }, [user]);

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-white border-r border-gray-100 z-40 flex flex-col transition-all duration-300 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 overflow-hidden">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
          <GraduationCap size={16} className="text-white" />
        </div>
        {isOpen && (
          <span className="font-semibold text-gray-900 text-sm tracking-tight whitespace-nowrap">
            EventSphere
          </span>
        )}
      </div>

      {/* ── Main nav ── */}
      <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2 overflow-y-auto">
        {mainNav.map(({ label, path, icon: Icon, children }) => {
          // Extracts base matching route root segment (e.g., "/academics" or "/career")
          const basePathSegment = path.split("/").slice(0, 2).join("/");

          // Top-level active highlights — works flawlessly now based on clean prefixes
          const isActive =
            path === "/"
              ? pathname === "/"
              : pathname.startsWith(basePathSegment);

          const showChildren =
            isOpen &&
            children &&
            ((basePathSegment === "/academics" && academicsActive) ||
              (basePathSegment === "/career" && careerActive));

          return (
            <div key={label}>
              <NavLink
                to={path}
                end={path === "/"}
                onClick={(e) => {
                  // If we are already somewhere within this section, let it just toggle accordion without reloading data
                  if (
                    children &&
                    isOpen &&
                    pathname.startsWith(basePathSegment)
                  ) {
                    e.preventDefault();
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {isOpen && <span className="whitespace-nowrap">{label}</span>}
              </NavLink>

              {/* Sub-items */}
              {showChildren && (
                <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-gray-100 pl-3">
                  {children.map(
                    ({
                      label: childLabel,
                      path: childPath,
                      icon: ChildIcon,
                      disabled,
                      exact,
                    }) => {
                      if (!childPath) return null;

                      const isChildActive = exact
                        ? pathname === childPath
                        : pathname.startsWith(childPath) &&
                            childPath !== "/career"
                          ? true
                          : pathname === childPath;

                      return (
                        <NavLink
                          key={childLabel}
                          to={disabled ? "#" : childPath}
                          className={`flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                            isChildActive && !disabled
                              ? "text-gray-900 bg-gray-100"
                              : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                          } ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
                        >
                          <ChildIcon size={13} className="flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            {childLabel}
                          </span>
                        </NavLink>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Bottom nav ── */}
      <div className="py-4 flex flex-col gap-0.5 px-2 border-t border-gray-100 overflow-hidden">
        {bottomNav.map(({ label, path, icon: Icon }) => {
          if (
            label === "Admin" &&
            !["superadmin", "placementCoordinator"].includes(user?.role)
          ) {
            return null;
          }

          return (
            <NavLink
              key={label}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {isOpen && <span className="whitespace-nowrap">{label}</span>}
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
