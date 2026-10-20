import { useState, useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import { getCareerDashboard } from "../../api/career.api";
import NoticeFeed from "../../components/cards/NoticeFeed";
import {
  LoadError,
  LogoTile,
  PageTitle,
  Pill,
  Row,
  Rows,
  SectionHead,
  note,
  tone,
} from "../../components/common/ui";
import { APPLICATION_STATUS, JOB_TYPE, ROUND_STATE, describeDeadline, drivePay } from "./format";

const APPLICATIONS_SHOWN = 5;

const Skeleton = () => (
  <div className="animate-pulse pb-10" aria-busy="true">
    <div className="mt-1 h-9 w-40 rounded-lg bg-soft lg:mt-4" />
    <div className="mt-3 h-4 w-80 max-w-full rounded bg-soft" />
    <div className="mt-14">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex h-16 items-center gap-4 border-t border-line first:border-t-0">
          <div className="size-10 flex-none rounded-[11px] bg-soft" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded bg-soft" />
            <div className="h-3 w-1/4 rounded bg-soft" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// The counts as a sentence under the title.
const summary = ({ eligibleDrives = 0, applied = 0, activeApplications = 0 }, canEvaluate) =>
  [
    canEvaluate && `${plural(eligibleDrives, "drive is", "drives are")} open to you.`,
    applied > 0
      ? `You have applied to ${applied}${
          activeApplications > 0
            ? `, and ${plural(activeApplications, "application is", "applications are")} still active`
            : ""
        }.`
      : "You have not applied to any drives yet.",
  ]
    .filter(Boolean)
    .join(" ");

// An eligible drive the student has not applied to: the pay, and under it how
// long applications stay open.
const DriveRow = ({ drive }) => {
  const deadline = describeDeadline(drive.registrationDeadline);
  const pay = drivePay(drive);
  return (
    <Row
      to={`/career/drives/${drive._id}`}
      lead={<LogoTile src={drive.companyLogo} name={drive.companyName} />}
      title={drive.companyName}
      meta={[drive.role, JOB_TYPE[drive.jobType], drive.location].filter(Boolean).join(", ")}
      end={
        <>
          {pay && <b className="block text-[15px] font-[650] tracking-[-0.02em] text-ink">{pay}</b>}
          {deadline && <span className={tone[deadline.tone] || ""}>{deadline.label}</span>}
        </>
      }
    />
  );
};

const CareerDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCareerDashboard();
        setData(res.data.data);
      } catch (err) {
        console.error(err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Skeleton />;
  if (loadError)
    return (
      <div className="pb-10">
        <PageTitle title="Career" />
        <div className="mt-9">
          <LoadError>Could not load your career overview. Refresh the page to try again.</LoadError>
        </div>
      </div>
    );

  const {
    eligibleDrives = [],
    myApplications = [],
    myActivities = [],
    placementProfile = {},
    stats = {},
  } = data || {};

  const canEvaluate = placementProfile.canEvaluateEligibility !== false;
  const managesNotices = user?.role === "superadmin" || user?.role === "placementCoordinator";
  // The round each active application is at, by application id.
  const roundOf = new Map(myActivities.map((a) => [String(a._id), a.round]));

  return (
    <div className="pb-10 lg:pb-20">
      <PageTitle title="Career" sub={summary(stats, canEvaluate)} />

      <div className="mt-9 grid grid-cols-1 gap-y-11 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-x-[72px]">
        <div className="min-w-0 space-y-11 lg:space-y-14">
          {/* Eligible drives the student has not applied to, soonest deadline first */}
          <section>
            <SectionHead title="Open to you" linkTo="/career/drives" linkLabel="All drives" />
            {!canEvaluate ? (
              <p className={note}>
                Your CGPA is not on record yet, so the drives you are eligible for can't be listed.
              </p>
            ) : eligibleDrives.length > 0 ? (
              <Rows>
                {eligibleDrives.map((drive) => (
                  <DriveRow key={drive._id} drive={drive} />
                ))}
              </Rows>
            ) : (
              <p className={note}>No eligible drives are open right now.</p>
            )}
          </section>

          <section>
            <SectionHead
              title="Your applications"
              linkTo="/career/my-applications"
              linkLabel="All applications"
            />
            {myApplications.length > 0 ? (
              <Rows>
                {myApplications.slice(0, APPLICATIONS_SHOWN).map((app) => {
                  const status = APPLICATION_STATUS[app.status] ?? APPLICATION_STATUS.active;
                  const round = app.status === "active" ? roundOf.get(String(app._id)) : null;
                  return (
                    <Row
                      key={app._id}
                      to={`/career/drives/${app.drive._id}`}
                      lead={<LogoTile src={app.drive.companyLogo} name={app.drive.companyName} />}
                      title={app.drive.companyName}
                      meta={[
                        app.drive.role,
                        // Where an active application stands right now
                        round && `${round.name}: ${(ROUND_STATE[round.derivedState] || ROUND_STATE.upcoming).label.toLowerCase()}`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      end={<Pill tone={status.tone}>{status.label}</Pill>}
                    />
                  );
                })}
              </Rows>
            ) : (
              <p className={note}>You haven't applied to any drives yet.</p>
            )}
          </section>
        </div>

        {/* Notices can be urgent, so they lead on phones */}
        <aside className="min-w-0 max-lg:order-first">
          <NoticeFeed
            targetType="career"
            title="Placement notices"
            canPost={managesNotices}
            showActions={managesNotices}
          />
        </aside>
      </div>
    </div>
  );
};

export default CareerDashboard;
