import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyApplications } from "../../api/career.api";
import { formatDateTime, formatShortDate } from "../../utils/formatDate";
import {
  Chips,
  LoadError,
  LogoTile,
  PageTitle,
  Pill,
  focusRing,
  note,
  panel,
  textLink,
  tone,
} from "../../components/common/ui";
import { APPLICATION_STATUS, ROUND_STATE, drivePay, formatRoundDate } from "./format";

const sameId = (a, b) => String(a) === String(b);

// The application as a path: applying, then each of the drive's rounds in
// order. Round names and their state come from the drive itself; there is no
// fixed assessment/interview vocabulary.
//   done  passed            now   where an active application stands
//   todo  not reached yet   out   where a rejected one ended   won  selected
const buildSteps = (application) => {
  const { status, timeline = [], drive = {} } = application;
  const rounds = drive.rounds || [];
  const currentIndex = rounds.findIndex((r) => sameId(r._id, drive.currentRoundId));
  const last = (wanted) => [...timeline].reverse().find((t) => t.status === wanted);

  // For a rejected application, the round where it actually ended.
  const rejection = status === "rejected" ? last("rejected") : null;
  const rejectedIndex = rejection ? rounds.findIndex((r) => sameId(r._id, rejection.roundId)) : -1;

  const steps = [
    { key: "applied", title: "Applied", lines: [formatShortDate(application.appliedAt)], state: "done" },
  ];

  rounds.forEach((round, i) => {
    const when = formatRoundDate(round.startDate);
    let state = "todo";
    let lines = [when];

    if (status === "selected") {
      state = "done";
    } else if (status === "rejected") {
      if (rejectedIndex === -1) lines = [when];
      else if (i < rejectedIndex) state = "done";
      else if (i === rejectedIndex) {
        state = "out";
        lines = [`Not shortlisted, ${formatShortDate(rejection.changedAt)}`];
      } else lines = ["Not reached"];
    } else if (currentIndex !== -1 && i < currentIndex) {
      state = "done";
    } else if (i === currentIndex) {
      state = "now";
      lines = [ROUND_STATE[round.derivedState]?.label || "Upcoming", round.startDate && when].filter(Boolean);
    }

    steps.push({ key: round._id, title: round.name, lines, state });
  });

  if (status === "selected") {
    const selection = last("selected");
    steps.push({
      key: "selected",
      title: "Selected",
      lines: selection ? [formatShortDate(selection.changedAt)] : [],
      state: "won",
    });
  }

  return { steps, rounds, currentIndex, rejectedRound: rounds[rejectedIndex] };
};

const stepDot = {
  done: "bg-ink",
  now: "bg-white ring-[5px] ring-inset ring-ink",
  todo: "bg-white ring-2 ring-inset ring-line-2",
  out: "bg-urgent",
  won: "bg-live",
};
const stepSaid = { done: "Done", now: "Current", todo: "Not reached yet", out: "Ended here", won: "Selected" };

// Across the card from lg up; down the card on phones.
const Steps = ({ steps }) => (
  <ol className="mt-7 grid grid-cols-1 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
    {steps.map((step, i) => (
      <li
        key={step.key}
        className="relative grid grid-cols-[18px_minmax(0,1fr)] gap-x-3.5 pb-[18px] last:pb-0 lg:block lg:pb-0 lg:pr-4"
      >
        {i < steps.length - 1 && (
          <span
            aria-hidden="true"
            className={`absolute bottom-0 left-2 top-[18px] w-0.5 lg:bottom-auto lg:left-[18px] lg:right-0 lg:top-2 lg:h-0.5 lg:w-auto ${
              step.state === "done" ? "bg-ink" : "bg-line-2"
            }`}
          />
        )}
        <span aria-hidden="true" className={`relative block size-[18px] rounded-full ${stepDot[step.state]}`} />
        <div className="min-w-0">
          <p
            className={`-mt-0.5 break-words text-[14.5px] tracking-[-0.015em] lg:mt-3 ${
              step.state === "todo" ? "font-medium text-ink-3" : "font-semibold text-ink"
            }`}
          >
            <span className="sr-only">{stepSaid[step.state]}: </span>
            {step.title}
          </p>
          {step.lines.map((line) => (
            <p key={line} className="text-[13.5px] text-ink-2">
              {line}
            </p>
          ))}
        </div>
      </li>
    ))}
  </ol>
);

const ApplicationCard = ({ application }) => {
  const [expanded, setExpanded] = useState(false);
  const status = APPLICATION_STATUS[application.status] || APPLICATION_STATUS.active;
  const drive = application.drive || {};
  const { steps, rounds, currentIndex, rejectedRound } = buildSteps(application);
  const timeline = application.timeline || [];

  const outcome =
    application.status === "selected"
      ? { text: "Congratulations! You have been selected.", className: tone.live }
      : application.status === "rejected"
        ? {
            text: rejectedRound
              ? `Not shortlisted after ${rejectedRound.name}.`
              : "Application was not successful for this drive.",
          }
        : currentIndex === -1
          ? { text: "Recruitment hasn't started yet. You're registered." }
          : null;

  return (
    <li className={`px-5 py-5 lg:px-7 lg:pb-7 lg:pt-[26px] ${panel}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <LogoTile src={drive.companyLogo} name={drive.companyName} />
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="truncate text-[18px] font-[650] tracking-[-0.03em] text-ink">
            <Link
              to={`/career/drives/${drive._id}`}
              className={`rounded decoration-ink/25 underline-offset-4 hover:underline ${focusRing}`}
            >
              {drive.companyName}
            </Link>
          </h2>
          <p className="text-[14.5px] text-ink-2">
            {[drive.role, drivePay(drive)].filter(Boolean).join(", ")}. Applied{" "}
            {formatShortDate(application.appliedAt)}.
          </p>
        </div>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>

      <Steps steps={steps} />

      {outcome && (
        <p className={`mt-[22px] border-t border-line pt-[18px] text-[14.5px] ${outcome.className || "text-ink-2"}`}>
          {outcome.text}
        </p>
      )}

      {timeline.length > 0 && (
        <div className={outcome ? "mt-3" : "mt-[22px] border-t border-line pt-4"}>
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            aria-expanded={expanded}
            className={textLink}
          >
            {expanded ? "Hide history" : "Show history"}
          </button>
          {expanded && (
            <ol className="mt-3 space-y-3">
              {timeline.map((entry, i) => {
                const round = rounds.find((r) => sameId(r._id, entry.roundId));
                return (
                  <li key={i} className="text-[13.5px]">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-ink">
                        {round ? round.name : (APPLICATION_STATUS[entry.status] || APPLICATION_STATUS.active).label}
                      </span>
                      <span className="text-ink-3">{formatDateTime(entry.changedAt)}</span>
                    </p>
                    {entry.note && <p className="mt-0.5 leading-normal text-ink-2">{entry.note}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </li>
  );
};

const Skeleton = () => (
  <div className="mt-8 animate-pulse space-y-5" aria-busy="true">
    {[0, 1].map((i) => (
      <div key={i} className="h-44 rounded-panel bg-soft" />
    ))}
  </div>
);

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await getMyApplications();
        setApplications(res.data.data || []);
      } catch (err) {
        console.error(err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const count = (key) => applications.filter((a) => a.status === key).length;
  const filters = [
    { value: "all", label: `All ${applications.length}` },
    { value: "active", label: `Active ${count("active")}` },
    { value: "selected", label: `Selected ${count("selected")}` },
    { value: "rejected", label: `Rejected ${count("rejected")}` },
  ];

  const filtered = applications.filter((app) => filter === "all" || app.status === filter);

  return (
    <div className="pb-10 lg:pb-20">
      <PageTitle title="My applications" />

      {!loading && !loadError && applications.length > 0 && (
        <div className="mt-6">
          <Chips label="Status" options={filters} value={filter} onChange={setFilter} />
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : loadError ? (
        <div className="mt-9">
          <LoadError>Could not load your applications. Refresh the page to try again.</LoadError>
        </div>
      ) : filtered.length > 0 ? (
        <ul className="mt-8 grid gap-5">
          {filtered.map((app) => (
            <ApplicationCard key={app._id} application={app} />
          ))}
        </ul>
      ) : (
        <p className={`mt-9 ${note}`}>
          {applications.length > 0
            ? "No applications match this filter."
            : "You haven't applied to any drives yet. "}
          {applications.length === 0 && (
            <Link
              to="/career/drives"
              className={`rounded font-[550] text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-ink ${focusRing}`}
            >
              Browse open drives
            </Link>
          )}
        </p>
      )}
    </div>
  );
};

export default MyApplications;
