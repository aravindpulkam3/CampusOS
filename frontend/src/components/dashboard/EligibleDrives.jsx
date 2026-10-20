import { Link } from "react-router-dom";
import { LogoTile, Row, Rows, SectionHead, focusRing } from "../common/ui";
import { describeDue } from "./format";

const ROWS = 3;

const note = "py-1.5 text-[14.5px] text-ink-2";
const noteLink = `rounded font-[550] text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-ink ${focusRing}`;

// Keyed on the TWO independent profile flags:
//   canEvaluateEligibility false → we cannot tell; claim nothing
//   evaluable but incomplete     → show drives, note the imprecision
// `shownAbove` holds the dontMiss ids of drives already in the attention feed,
// so a drive closing today is not listed twice on the page.
const EligibleDrives = ({ drives = [], profile = {}, shownAbove }) => {
  const { canEvaluateEligibility = true, placementProfileComplete = true } = profile;
  const others = drives.filter((drive) => !shownAbove?.has(`drive-${drive.id}`));
  const rows = (others.length > 0 ? others : drives).slice(0, ROWS);

  return (
    <section className="min-w-0">
      <SectionHead title="Drives open to you" linkTo="/career/drives" linkLabel="All drives" />
      {!canEvaluateEligibility ? (
        // CGPA and backlogs are the roster's: the student can look, not edit.
        <p className={note}>
          Your CGPA is not on record yet, so the drives you are eligible for can't be listed. The
          placement office adds it;{" "}
          <Link to="/profile" className={noteLink}>
            your profile
          </Link>{" "}
          shows what is on file.
        </p>
      ) : rows.length > 0 ? (
        <Rows>
          {rows.map((drive) => {
            const due = describeDue(drive.registrationDeadline);
            const pay = drive.ctc || drive.stipend;
            return (
              <Row
                key={drive.id}
                to={drive.url}
                lead={<LogoTile src={drive.companyLogo} name={drive.companyName} />}
                title={drive.companyName}
                meta={[drive.role, due && `closes ${due.phrase}`].filter(Boolean).join(", ")}
                end={
                  pay && (
                    <b className="text-[15px] font-[650] tracking-[-0.02em] text-ink">{pay}</b>
                  )
                }
              />
            );
          })}
        </Rows>
      ) : (
        <p className={note}>No eligible drives are accepting applications right now.</p>
      )}
      {canEvaluateEligibility && !placementProfileComplete && (
        <p className="mt-3 text-[13.5px] text-ink-3">
          Your backlog count is not on record yet, so this list may include drives you are not
          eligible for.{" "}
          <Link to="/profile" className={`rounded underline underline-offset-[3px] transition-colors hover:text-ink ${focusRing}`}>
            See your profile
          </Link>
        </p>
      )}
    </section>
  );
};

export default EligibleDrives;
