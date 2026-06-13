import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Briefcase, ChevronRight, Plus, Clock } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useDebounce from "../../hooks/useDebounce";
import { getAllDrives } from "../../api/career.api";

// ─── Helpers ──────────────────────────────────────────────────
const formatDeadline = (d) => {
  if (!d) return null;
  const diff = new Date(d) - new Date();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: "Closed", color: "text-gray-400" };
  if (days === 0) return { label: "Closes Today", color: "text-red-600" };
  if (days === 1) return { label: "Tomorrow", color: "text-amber-600" };
  return { label: `${days}d left`, color: "text-gray-500" };
};

const statusConfig = {
  upcoming: { label: "Upcoming", color: "bg-gray-100 text-gray-600" },
  open: { label: "Open", color: "bg-green-50 text-green-700" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-400" },
};

const jobTypeConfig = {
  internship: { label: "Internship", color: "bg-blue-50 text-blue-700" },
  fulltime: { label: "Full Time", color: "bg-purple-50 text-purple-700" },
};

const driveTypeLabel = {
  oncampus: "On Campus",
  offcampus: "Off Campus",
  poolcampus: "Pool Campus",
};

// ─── Drive Card ───────────────────────────────────────────────
const DriveCard = ({ drive }) => {
  const deadline = formatDeadline(drive.registrationDeadline);
  const statusCfg = statusConfig[drive.status] || statusConfig.open;
  const jobCfg = jobTypeConfig[drive.jobType] || jobTypeConfig.fulltime;

  return (
    <Link
      to={`/career/drives/${drive._id}`}
      className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
    >
      {/* Logo */}
      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {drive.companyLogo ? (
          <img
            src={drive.companyLogo}
            alt={drive.companyName}
            className="w-full h-full object-contain p-1.5"
          />
        ) : (
          <span className="text-sm font-bold text-gray-500">
            {drive.companyName?.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-gray-700">
              {drive.companyName}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{drive.role}</p>
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusCfg.color}`}
          >
            {statusCfg.label}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${jobCfg.color}`}
          >
            {jobCfg.label}
          </span>
          {drive.driveType && (
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
              {driveTypeLabel[drive.driveType]}
            </span>
          )}
          {drive.location && (
            <span className="text-xs text-gray-400">{drive.location}</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold text-gray-700">
              {drive.jobType === "internship"
                ? drive.stipend || "Stipend TBD"
                : drive.ctc || "CTC TBD"}
            </p>
            {drive.eligibleBranches?.length > 0 && (
              <p className="text-xs text-gray-400">
                {drive.eligibleBranches.slice(0, 3).join(", ")}
                {drive.eligibleBranches.length > 3 &&
                  ` +${drive.eligibleBranches.length - 3}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={10} className="text-gray-400" />
            {deadline && (
              <span className={`text-xs font-medium ${deadline.color}`}>
                {deadline.label}
              </span>
            )}
          </div>
        </div>
      </div>

      <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
    </Link>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────
const Skeleton = () => (
  <div className="space-y-3">
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="flex gap-4 p-4 bg-white border border-gray-100 rounded-xl animate-pulse"
      >
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className="w-32 h-4 bg-gray-100 rounded" />
            <div className="w-14 h-4 bg-gray-100 rounded-full" />
          </div>
          <div className="w-48 h-3 bg-gray-100 rounded" />
          <div className="flex gap-2">
            <div className="w-20 h-5 bg-gray-100 rounded-full" />
            <div className="w-20 h-5 bg-gray-100 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ─── Filter Pill ──────────────────────────────────────────────
const FilterPill = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150
      ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-700"
      }`}
  >
    {label}
  </button>
);

// ─── Main ─────────────────────────────────────────────────────
const DrivesList = () => {
  const { user } = useAuth();
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  // Active filters matrix
  const [status, setStatus] = useState("all");
  const [jobType, setJobType] = useState("all");
  const [eligible, setEligible] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // API handler execution block with page tracking inputs
  const fetchDrives = useCallback(
    async (pageNumber = 1) => {
      setLoading(true);
      try {
        const res = await getAllDrives({
          ...(status !== "all" && { status }),
          ...(jobType !== "all" && { jobType }),
          ...(eligible && { eligibleOnly: "true" }),
          ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
          page: pageNumber,
          limit: 20,
        });
        setDrives(res.data.data.drives || []);
        setPagination(res.data.data.pagination);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [status, jobType, eligible, debouncedSearch],
  );

  // Triggers reload fallback to page 1 upon filter mutations
  useEffect(() => {
    fetchDrives(1);
  }, [fetchDrives]);

  // Superadmin & Placement Coordinator Permission Authorization Boundary check
  const isAdmin = ["superadmin", "placementCoordinator"].includes(user?.role);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Placement Drives
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? "Loading..." : `${pagination.total} drives available`}
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/career/drives/create"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={13} /> Create Drive
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80 mb-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Status */}
        <FilterPill
          label="All"
          active={status === "all"}
          onClick={() => setStatus("all")}
        />
        <FilterPill
          label="Open"
          active={status === "open"}
          onClick={() => setStatus(status === "open" ? "all" : "open")}
        />
        <FilterPill
          label="Closed"
          active={status === "closed"}
          onClick={() => setStatus(status === "closed" ? "all" : "closed")}
        />

        <span className="w-px bg-gray-200 self-stretch mx-1" />

        {/* Job type */}
        <FilterPill
          label="Internship"
          active={jobType === "internship"}
          onClick={() =>
            setJobType(jobType === "internship" ? "all" : "internship")
          }
        />
        <FilterPill
          label="Full Time"
          active={jobType === "fulltime"}
          onClick={() =>
            setJobType(jobType === "fulltime" ? "all" : "fulltime")
          }
        />

        <span className="w-px bg-gray-200 self-stretch mx-1" />

        {/* Eligibility */}
        <FilterPill
          label="Eligible Only"
          active={eligible}
          onClick={() => setEligible((p) => !p)}
        />
      </div>

      {/* List Feed rendering blocks */}
      {loading ? (
        <Skeleton />
      ) : drives.length > 0 ? (
        <>
          <div className="space-y-3">
            {drives.map((drive) => (
              <DriveCard key={drive._id} drive={drive} />
            ))}
          </div>

          {/* Core Multi-page interactive layout wrapper */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => fetchDrives(p)}
                    className={`w-8 h-8 text-xs font-medium rounded-lg border transition-all ${
                      p === pagination.page
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-xl text-center">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Briefcase size={16} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">
            No drives found
          </p>
          <p className="text-xs text-gray-400">
            {search
              ? `No results for "${search}"`
              : "No drives match your current filters"}
          </p>
        </div>
      )}
    </div>
  );
};

export default DrivesList;
