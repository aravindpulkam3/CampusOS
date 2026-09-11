import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Search,
  X,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import { getAllEvents, registerForEvent } from "../../api/event.api";
import useAuth from "../../hooks/useAuth";

const CATEGORIES = [
  "All",
  "Technical",
  "Cultural",
  "Creative",
  "Business",
  "Sports",
];

const categoryColor = {
  Technical: "text-blue-700 bg-blue-50 border-blue-100/50",
  Cultural: "text-purple-700 bg-purple-50 border-purple-100/50",
  Creative: "text-orange-700 bg-orange-50 border-orange-100/50",
  Business: "text-green-700 bg-green-50 border-green-100/50",
  Sports: "text-emerald-700 bg-emerald-50 border-emerald-100/50",
};

const statusConfig = {
  Upcoming: { color: "text-emerald-700 bg-emerald-50", dot: "bg-emerald-500" },
  Ongoing: {
    color: "text-blue-700 bg-blue-50",
    dot: "bg-blue-500 animate-pulse",
  },
  Completed: { color: "text-slate-500 bg-slate-100", dot: "bg-slate-400" },
};

const getStatus = (event) => {
  const now = new Date();
  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);
  if (now < start) return "Upcoming";
  if (now >= start && now <= end) return "Ongoing";
  return "Completed";
};

const formatTime = (event, status) => {
  if (!event.startDateTime) return "";
  const timeOpts = { hour: "2-digit", minute: "2-digit", hour12: false };
  if (status === "Ongoing")
    return `Ends ${new Date(event.endDateTime).toLocaleTimeString("en-IN", timeOpts)}`;
  return new Date(event.startDateTime).toLocaleTimeString("en-IN", timeOpts);
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const handleRegister = async (e, eventId) => {
  e.stopPropagation();
  try {
    const payload = await registerForEvent(eventId);
    setFeedItems((prev) =>
      prev.map((ev) => (ev._id === eventId ? payload.data.data.event : ev)),
    );
    setUser(payload.data.data.user);
  } catch (err) {
    console.error(err);
  }
};

const CardSkeleton = () => (
  <div className="border border-slate-100 rounded-2xl overflow-hidden animate-pulse bg-white space-y-4 p-4 shadow-3xs">
    <div className="h-40 bg-slate-100 rounded-xl" />
    <div className="space-y-2">
      <div className="w-1/3 h-3 bg-slate-100 rounded" />
      <div className="w-3/4 h-4 bg-slate-100 rounded" />
    </div>
    <div className="h-8 bg-slate-50 rounded-xl pt-2" />
  </div>
);

export default function Events() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [feedItems, setFeedItems] = useState([]);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setDebouncedSearch(search);
  }, [search]);

  const fetchFeed = useCallback(
    async (currentOffset = 0, append = false) => {
      try {
        if (append) setLoadMoreLoading(true);
        else setFeedLoading(true);

        const res = await getAllEvents({
          category: activeCategory,
          search: debouncedSearch,
          offset: currentOffset,
        });

        const {
          events = [],
          hasMore: nextHasMore,
          nextOffset,
        } = res?.data?.data || {};

        setFeedItems((prev) => (append ? [...prev, ...events] : events));
        setHasMore(nextHasMore);
        setOffset(nextOffset);
      } catch (err) {
        console.error("Events sync error:", err);
      } finally {
        setFeedLoading(false);
        setLoadMoreLoading(false);
      }
    },
    [activeCategory, debouncedSearch],
  );

  useEffect(() => {
    fetchFeed(0, false);
  }, [activeCategory, debouncedSearch, fetchFeed]);

  const handleLoadMore = () => {
    if (!loadMoreLoading && hasMore) {
      fetchFeed(offset, true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 space-y-5">
      {/* Search Header Action Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-100 p-3 rounded-2xl shadow-3xs">
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Campus Timelines
          </h2>
          <p className="text-xs font-semibold text-slate-800 mt-0.5">
            Explore active community events
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search matching events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-slate-300 placeholder:text-slate-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Categories Filter Ribbon */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border whitespace-nowrap transition-all duration-150 shadow-3xs
              ${
                activeCategory === cat
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-800"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content Rendering Layout */}
      {feedLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : feedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl text-center shadow-3xs">
          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-3 shadow-3xs">
            <Calendar size={15} className="text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-800">
            No synchronized entries match criteria
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {feedItems.map((event) => {
              const isRegistered = event.registeredStudents?.some(
                (id) => (id._id ?? id) === user?._id,
              );
              const status = getStatus(event);
              const statusCfg = statusConfig[status] || statusConfig.Upcoming;
              const catStyle =
                categoryColor[event.category] || "text-slate-600 bg-slate-100";
              const isClosed = status === "Completed";

              return (
                <div
                  key={event._id}
                  onClick={() => navigate(`/community/events/${event._id}`)}
                  className="group border border-slate-100/80 rounded-2xl overflow-hidden cursor-pointer hover:border-slate-300 hover:shadow-xs transition-all duration-200 bg-white flex flex-col shadow-3xs relative"
                >
                  <div className="relative h-40 bg-slate-50 overflow-hidden flex-shrink-0 border-b border-slate-50">
                    {event.banner ? (
                      <img
                        src={event.banner}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                        <Calendar size={22} className="text-slate-300" />
                      </div>
                    )}
                    <span
                      className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-xs bg-white/80 tracking-wide uppercase ${catStyle}`}
                    >
                      {event.category}
                    </span>
                    <span className="absolute top-3 right-3 text-[10px] font-bold text-slate-700 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-100/40">
                      {formatDate(event.startDateTime)}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col flex-1 space-y-3.5">
                    <div className="space-y-1">
                      {event.organizerClub?.clubName && (
                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                          {event.organizerClub.clubName}
                        </p>
                      )}
                      <h3 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-slate-900 transition-colors">
                        {event.eventName}
                      </h3>
                    </div>

                    <div className="space-y-1.5 text-[11px] font-medium text-slate-400">
                      {event.venue && (
                        <div className="flex items-center gap-1.5">
                          <MapPin
                            size={12}
                            className="text-slate-300 flex-shrink-0"
                          />
                          <span className="truncate">{event.venue}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusCfg.color}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                          />
                          {status}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate font-semibold">
                          {formatTime(event, status)}
                        </span>
                      </div>

                      {isRegistered ? (
                        <button
                          disabled
                          className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl whitespace-nowrap flex-shrink-0"
                        >
                          ✓ Enrolled
                        </button>
                      ) : isClosed ? (
                        <button
                          disabled
                          className="text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl cursor-not-allowed whitespace-nowrap flex-shrink-0"
                        >
                          Closed
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleRegister(e, event._id)}
                          className="text-[11px] font-bold text-white bg-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-800 active:scale-97 transition-all whitespace-nowrap flex-shrink-0 group/btn flex items-center gap-1"
                        >
                          Register{" "}
                          <ArrowUpRight
                            size={10}
                            className="text-slate-400 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform"
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Consistent Load More Button */}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadMoreLoading}
              className="flex items-center justify-center gap-2 w-full py-3 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50/50 transition-all disabled:opacity-50"
            >
              {loadMoreLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-slate-400" />{" "}
                  Slicing Next Registry Block...
                </>
              ) : (
                "Load More Scheduled Events"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
