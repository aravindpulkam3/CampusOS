import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useDebounce from "../../hooks/useDebounce";
import { getAllDrives } from "../../api/career.api";
import {
  Chips,
  LoadError,
  LogoTile,
  PageNumbers,
  PageTitle,
  SearchField,
  Switch,
  btn,
  focusRing,
  note,
  tone,
} from "../../components/common/ui";
import { DRIVE_TYPE, JOB_TYPE, describeDeadline, drivePay } from "./format";

const PAGE_SIZE = 20;

const STATUSES = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];
const JOB_TYPES = [
  { value: "internship", label: "Internship" },
  { value: "fulltime", label: "Full time" },
];

// Shared by the column headings and every row, so they line up.
const columns =
  "lg:grid lg:grid-cols-[40px_minmax(0,1.5fr)_minmax(0,1fr)_132px_150px] lg:items-center lg:gap-x-5";

// One drive. A row of a table from lg up; on phones the pay sits beside the
// name and the deadline goes underneath.
const DriveRow = ({ drive, showEligibility }) => {
  const deadline = describeDeadline(drive.registrationDeadline);
  const closed = !deadline || deadline.closed;
  const pay = drivePay(drive);
  const ineligible = showEligibility && !closed && !drive.hasApplied && drive.eligibility?.eligible === false;

  let state = deadline?.label || "Closed";
  let stateClass = tone[deadline?.tone] || "text-ink-2";
  if (drive.hasApplied) [state, stateClass] = ["Applied", tone.live];
  else if (ineligible) [state, stateClass] = ["Not eligible", "text-ink-3"];

  return (
    <li>
      <Link
        to={`/career/drives/${drive._id}`}
        className={`group flex min-h-[72px] flex-wrap items-center gap-x-4 gap-y-0.5 rounded-lg py-3 ${columns} ${focusRing}`}
      >
        <LogoTile src={drive.companyLogo} name={drive.companyName} />
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[15px] leading-[1.35] tracking-[-0.018em] decoration-ink/25 underline-offset-[3px] group-hover:underline ${
              closed && !drive.hasApplied ? "font-medium text-ink-3" : "font-semibold text-ink"
            }`}
          >
            {drive.companyName}
          </span>
          <span className="mt-px block truncate text-[13.5px] text-ink-2">{drive.role}</span>
        </span>
        <span className="truncate text-[14.5px] text-ink-2 max-lg:hidden">
          {[JOB_TYPE[drive.jobType], DRIVE_TYPE[drive.driveType]?.toLowerCase(), drive.location]
            .filter(Boolean)
            .join(", ")}
        </span>
        <span
          className={`flex-none truncate text-[15px] tracking-[-0.02em] ${
            closed && !drive.hasApplied ? "font-medium text-ink-3" : "font-[650] text-ink"
          }`}
        >
          {pay}
        </span>
        <span className="text-[14.5px] max-lg:w-full max-lg:pl-14 lg:text-right">
          <span className={stateClass}>{state}</span>
          {deadline && (
            <span className="text-[13px] text-ink-3 max-lg:ml-1.5 lg:block">{deadline.when}</span>
          )}
        </span>
      </Link>
    </li>
  );
};

const Skeleton = () => (
  <div className="mt-8 animate-pulse" aria-busy="true">
    {[0, 1, 2, 3, 4].map((i) => (
      <div key={i} className="flex h-[72px] items-center gap-4 border-t border-line first:border-t-0">
        <div className="size-10 flex-none rounded-[11px] bg-soft" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/3 rounded bg-soft" />
          <div className="h-3 w-1/4 rounded bg-soft" />
        </div>
        <div className="h-3.5 w-20 rounded bg-soft" />
      </div>
    ))}
  </div>
);

const DrivesList = () => {
  const { user } = useAuth();
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErrorPage, setLoadErrorPage] = useState(null);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [status, setStatus] = useState("all");
  const [jobType, setJobType] = useState("all");
  const [eligible, setEligible] = useState(false);
  const requestRef = useRef(0);
  const searchRef = useRef(search);

  const invalidateRequest = () => {
    requestRef.current += 1;
    setLoading(true);
    setLoadErrorPage(null);
  };

  const debouncedSearch = useDebounce(search, 400);

  const fetchDrives = useCallback(
    async (pageNumber = 1) => {
      if (debouncedSearch !== searchRef.current) return;
      const request = ++requestRef.current;
      setLoading(true);
      setLoadErrorPage(null);
      try {
        const res = await getAllDrives({
          ...(status !== "all" && { status }),
          ...(jobType !== "all" && { jobType }),
          ...(eligible && { eligibleOnly: "true" }),
          ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
          page: pageNumber,
          limit: PAGE_SIZE,
        });
        if (request !== requestRef.current) return;

        const rawDrives = res.data.data.drives || [];

        setDrives(rawDrives);
        setPagination(res.data.data.pagination);
      } catch (err) {
        if (request === requestRef.current) {
          console.error(err);
          setLoadErrorPage(pageNumber);
        }
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [status, jobType, eligible, debouncedSearch],
  );

  useEffect(() => {
    fetchDrives(1);
    return () => { requestRef.current += 1; };
  }, [fetchDrives]);

  const isAdmin = ["superadmin", "placementCoordinator"].includes(user?.role);
  const first = (pagination.page - 1) * PAGE_SIZE + 1;

  return (
    <div className="pb-10 lg:pb-20">
      <PageTitle title="Drives">
        {isAdmin && (
          <Link to="/career/drives/create" className={btn}>
            <Plus size={15} aria-hidden="true" /> Create drive
          </Link>
        )}
      </PageTitle>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div className="no-scrollbar -mx-1 flex min-w-0 items-center gap-2 overflow-x-auto px-1">
          <Chips
            className="flex-none"
            label="Registration"
            options={STATUSES}
            value={status}
            onChange={(next) => {
              if (next !== status) {
                invalidateRequest();
                setStatus(next);
              }
            }}
          />
          <span aria-hidden="true" className="h-5 w-px flex-none bg-line-2" />
          {/* Pressing the chosen type again clears it */}
          <Chips
            className="flex-none"
            label="Job type"
            options={JOB_TYPES}
            value={jobType}
            onChange={(next) => {
              invalidateRequest();
              setJobType(jobType === next ? "all" : next);
            }}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:gap-5">
          <Switch
            checked={eligible}
            onChange={(next) => {
              invalidateRequest();
              setEligible(next);
            }}
          >
            Eligible for me
          </Switch>
          <SearchField
            value={search}
            onChange={(value) => {
              searchRef.current = value;
              invalidateRequest();
              setSearch(value);
            }}
            label="Search placement drives"
            placeholder="Search company or role"
            className="sm:w-60"
          />
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : loadErrorPage !== null ? (
        <div className="mt-9">
          <LoadError onRetry={() => fetchDrives(loadErrorPage)}>Could not load drives.</LoadError>
        </div>
      ) : drives.length > 0 ? (
        <>
          <div
            aria-hidden="true"
            className={`mt-8 hidden border-b border-line-2 pb-3 text-[13px] text-ink-3 ${columns}`}
          >
            <span />
            <span>Company and role</span>
            <span>Type and location</span>
            <span>Pay</span>
            <span className="text-right">Applications close</span>
          </div>
          <ul className="divide-y divide-line max-lg:mt-6">
            {drives.map((drive) => (
              <DriveRow key={drive._id} drive={drive} showEligibility={user?.role === "student"} />
            ))}
          </ul>

          <PageNumbers page={pagination.page} pages={pagination.pages} onPage={fetchDrives}>
            Showing {first} to {first + drives.length - 1} of {pagination.total}{" "}
            {pagination.total === 1 ? "drive" : "drives"}
          </PageNumbers>
        </>
      ) : (
        <p className={`mt-9 ${note}`}>
          {debouncedSearch.trim()
            ? `No drives match "${debouncedSearch.trim()}".`
            : "No drives match these filters."}
        </p>
      )}
    </div>
  );
};

export default DrivesList;
