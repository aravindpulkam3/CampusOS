import { Link } from "react-router-dom";
import { Briefcase, UserCog } from "lucide-react";
import { Section, Empty } from "./Section";
import { describeDue } from "./format";

// Three distinct states, keyed on the TWO independent profile flags:
//   canEvaluateEligibility false → we cannot tell; claim nothing
//   evaluable but incomplete     → show drives, note the imprecision
//   complete                     → show drives plainly
const EligibleDrives = ({ drives = [], profile = {} }) => {
  const { canEvaluateEligibility = true, placementProfileComplete = true } =
    profile;

  return (
    <Section
      title="Eligible Drives"
      icon={Briefcase}
      linkTo="/career/drives"
      linkLabel="All drives"
    >
      {!canEvaluateEligibility ? (
        // Crucially NOT "no drives available" — we simply can't work it out yet,
        // and saying otherwise would wrongly imply the student doesn't qualify.
        <Link
          to="/profile"
          className="flex items-center gap-3 p-3 bg-amber-50/60 border border-amber-200 rounded-xl hover:border-amber-300 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <UserCog size={14} className="text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900">
              Complete your placement profile
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Add your CGPA to see the drives you're eligible for.
            </p>
          </div>
        </Link>
      ) : drives.length > 0 ? (
        <>
          <div className="space-y-2">
            {drives.map((drive) => {
              const due = describeDue(drive.registrationDeadline);
              return (
                <Link
                  key={drive.id}
                  to={drive.url}
                  className="flex items-center gap-3 p-3 bg-gray-50/80 border border-gray-100 rounded-xl hover:border-gray-300 hover:bg-white transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {drive.companyLogo ? (
                      <img
                        src={drive.companyLogo}
                        alt=""
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-xs font-bold text-gray-500">
                        {drive.companyName?.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-gray-700 transition-colors">
                      {drive.companyName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {drive.role}
                    </p>
                  </div>
                  {due && (
                    <span
                      className={`text-xs font-semibold flex-shrink-0 ${due.color}`}
                    >
                      {due.label === "Today" ? "Closes today" : due.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {!placementProfileComplete && (
            <Link
              to="/profile"
              className="block mt-3 text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              Add backlog information for more accurate eligibility →
            </Link>
          )}
        </>
      ) : (
        <Empty message="No eligible drives currently accepting applications." />
      )}
    </Section>
  );
};

export default EligibleDrives;
