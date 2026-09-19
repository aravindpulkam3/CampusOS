import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { Section, Empty } from "./Section";
import Row, { RowList } from "./Row";
import { describeDue } from "./format";

// Keyed on the TWO independent profile flags:
//   canEvaluateEligibility false → we cannot tell; claim nothing
//   evaluable but incomplete     → show drives, note the imprecision
const EligibleDrives = ({ drives = [], profile = {} }) => {
  const { canEvaluateEligibility = true, placementProfileComplete = true } = profile;

  return (
    <Section
      title="Eligible Drives"
      icon={Briefcase}
      linkTo="/career/drives"
      linkLabel="All drives"
      footer={
        canEvaluateEligibility &&
        !placementProfileComplete && (
          <Link
            to="/profile"
            className="text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
          >
            Add backlog information for more accurate eligibility →
          </Link>
        )
      }
    >
      {!canEvaluateEligibility ? (
        <RowList>
          <li>
            <Row url="/profile">
              <p className="flex-1 text-sm text-gray-600">
                Complete your placement profile to see eligible drives
              </p>
            </Row>
          </li>
        </RowList>
      ) : drives.length > 0 ? (
        <RowList>
          {drives.map((drive) => {
            const due = describeDue(drive.registrationDeadline);
            return (
              <li key={drive.id}>
                <Row
                  url={drive.url}
                  trailing={
                    due && (
                      <span className={`text-xs font-semibold flex-shrink-0 ${due.color}`}>
                        {due.label}
                      </span>
                    )
                  }
                >
                  <span className="w-6 h-6 rounded-md border border-gray-100 bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {drive.companyLogo ? (
                      <img src={drive.companyLogo} alt="" className="w-full h-full object-contain p-0.5" />
                    ) : (
                      <span className="text-[9px] font-bold text-gray-500">
                        {drive.companyName?.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <p className="flex-1 min-w-0 text-sm text-gray-900 truncate">
                    <span className="font-medium">{drive.companyName}</span>
                    {drive.role && <span className="text-gray-500"> — {drive.role}</span>}
                  </p>
                </Row>
              </li>
            );
          })}
        </RowList>
      ) : (
        <Empty message="No eligible drives currently accepting applications." />
      )}
    </Section>
  );
};

export default EligibleDrives;
