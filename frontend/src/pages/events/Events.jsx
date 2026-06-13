import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllEvents, registerForEvent } from "../../api/event.api";
import useAuth from "../../hooks/useAuth";

const CATEGORIES = ["All", "Technical", "Cultural", "Creative", "Business"];

const categoryColor = {
  Technical: "text-blue-600 bg-blue-50",
  Cultural: "text-purple-600 bg-purple-50",
  Creative: "text-orange-600 bg-orange-50",
  Business: "text-green-600 bg-green-50",
};

const statusColor = {
  Upcoming: "text-emerald-600 bg-emerald-50",
  Ongoing: "text-blue-600 bg-blue-50",
  Completed: "text-gray-500 bg-gray-100",
  Cancelled: "text-red-500 bg-red-50",
};

export default function Events() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const res = await getAllEvents();
        const data = res?.data?.data ?? [];
        setEvents(data);
        setFiltered(data);
      } catch (err) {
        setError("Failed to load events. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllEvents();
  }, []);

  // Filter whenever category or search changes
  useEffect(() => {
    let result = events;
    if (activeCategory !== "All") {
      result = result.filter((e) => e.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.eventName.toLowerCase().includes(q) ||
          e.organizerClub?.clubName?.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [activeCategory, search, events]);

  // Calculates the real-time runtime state of an event based on your schema's strict parameters
  const calculateEventStatus = (event) => {
    if (event.status === "Cancelled") return "Cancelled";

    const now = new Date();
    const start = new Date(event.startDateTime);
    const end = new Date(event.endDateTime);

    if (now < start) return "Upcoming";
    if (now >= start && now <= end) return "Ongoing";
    return "Completed";
  };

  // Formats the timestamp display dynamically based on the calculated current state context
  const formatEventTimeDisplay = (event, currentStatus) => {
    if (!event.startDateTime) return "";
    
    const startOpts = { day: "2-digit", month: "short", year: "numeric" };
    const timeOpts = { hour: "2-digit", minute: "2-digit", hour12: false };

    const startDate = new Date(event.startDateTime).toLocaleDateString("en-IN", startOpts);
    const startTime = new Date(event.startDateTime).toLocaleTimeString("en-IN", timeOpts);

    if (currentStatus === "Ongoing") {
      const endTime = new Date(event.endDateTime).toLocaleTimeString("en-IN", timeOpts);
      return `Live: Ends at ${endTime}`;
    }

    return `${startDate} · ${startTime}`;
  };

  const buildEligibilityLabel = (event) => {
    const branches =
      event.eligibleBranches?.length > 0
        ? event.eligibleBranches.join(", ")
        : "All Branches";
    const years =
      event.eligibleYears?.length > 0
        ? `Year ${event.eligibleYears.join(", ")}`
        : "All Years";
    return `${branches} · ${years}`;
  };

  const handleRegisterClick = async (e, eventId) => {
    e.stopPropagation(); 
    try {
      const payload = await registerForEvent(eventId);
      setUser(payload.data.data.user);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-800">Events</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg w-56">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs text-gray-700 placeholder:text-gray-300 outline-none bg-transparent w-full"
            />
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-6xl">
        {/* Category filter pills */}
        <div className="flex items-center gap-2 mb-7">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                activeCategory === cat
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400">No events found</p>
          </div>
        )}

        {/* Event grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((event) => {
              const isUserRegistered = event.registeredStudents?.includes(user?._id);
              const computedStatus = calculateEventStatus(event);

              return (
                <div
                  key={event._id}
                  onClick={() => navigate(`/community/events/${event._id}`)}
                  className="group border border-gray-150 rounded-xl p-5 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all duration-150 bg-white flex flex-col justify-between h-[250px]"
                >
                  <div>
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                          categoryColor[event.category] ?? "text-gray-600 bg-gray-100"
                        }`}
                      >
                        {event.category}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(event.startDateTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                    </div>

                    {/* Event name */}
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5 group-hover:text-gray-700 transition-colors leading-snug line-clamp-1">
                      {event.eventName}
                    </h3>
                    <p className="text-xs text-gray-400 mb-4 truncate">
                      {event.organizerClub?.clubName ?? "—"}
                    </p>

                    {/* Meta rows */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{event.venue}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{buildEligibilityLabel(event)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Context Layout */}
                  <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${statusColor[computedStatus]}`}>
                        {computedStatus}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {formatEventTimeDisplay(event, computedStatus)}
                      </span>
                    </div>

                    {/* Form control tracking access states based on computed layout contexts */}
                    {isUserRegistered ? (
                      <button
                        disabled
                        className="text-xs font-medium text-emerald-700 bg-emerald-50/60 border border-emerald-100 px-3 py-1.5 rounded-lg cursor-not-allowed whitespace-nowrap"
                      >
                        Registered
                      </button>
                    ) : computedStatus === "Completed" || computedStatus === "Cancelled" ? (
                      <button
                        disabled
                        className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg cursor-not-allowed whitespace-nowrap"
                      >
                        Closed
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleRegisterClick(e, event._id)}
                        className="text-xs font-medium text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all whitespace-nowrap shadow-2xs"
                      >
                        Register
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}