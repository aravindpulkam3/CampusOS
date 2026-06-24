import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, X, Calendar, MapPin,
  Users, ChevronRight, Megaphone,
} from "lucide-react";
import { deleteAnnouncement, getCommunityFeed }  from "../api/announcement.api";
import { getPopularClubs }   from "../api/club.api";
import { getUpcomingEvents } from "../api/event.api";
import useAuth               from "../hooks/useAuth";
import AnnouncementCard      from "./announcements/AnnouncementCard";
import NoticeFeed            from "../components/cards/NoticeFeed";

const clubBg = [
  "bg-gray-900", "bg-blue-600", "bg-purple-600",
  "bg-green-600", "bg-orange-500", "bg-rose-600",
];

// ─── Skeletons ────────────────────────────────────────────────
const FeedSkeleton = () => (
  <div className="flex flex-col gap-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse">
        <div className="flex justify-between mb-3">
          <div className="w-28 h-5 bg-gray-100 rounded-full" />
          <div className="w-12 h-4 bg-gray-100 rounded" />
        </div>
        <div className="w-3/4 h-4 bg-gray-100 rounded mb-2" />
        <div className="w-full h-3 bg-gray-100 rounded mb-1" />
        <div className="w-2/3 h-3 bg-gray-100 rounded mb-3" />
        <div className="w-24 h-3 bg-gray-100 rounded" />
      </div>
    ))}
  </div>
);

// ─── Upcoming Events ──────────────────────────────────────────
const UpcomingEventsWidget = ({ events, loading }) => {
  const isToday = (d) => d && new Date(d).toDateString() === new Date().toDateString();
  const isTomorrow = (d) => {
    if (!d) return false;
    const t = new Date(); t.setDate(t.getDate() + 1);
    return new Date(d).toDateString() === t.toDateString();
  };
  const isOngoing = (e) => {
    if (!e.startDateTime || !e.endDateTime) return false;
    const now = new Date();
    return now >= new Date(e.startDateTime) && now <= new Date(e.endDateTime);
  };
  const dateLabel = (event) => {
    const d = event.startDateTime;
    if (!d) return "—";
    if (isOngoing(event)) return <span className="text-blue-600 font-medium">Ongoing</span>;
    if (isToday(d))       return <span className="text-emerald-600 font-medium">Today</span>;
    if (isTomorrow(d))    return <span className="text-amber-600 font-medium">Tomorrow</span>;
    return <span className="text-gray-400">{new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={14} className="text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">Upcoming Events</h3>
      </div>
      {loading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between py-2.5">
              <div className="w-28 h-3 bg-gray-100 rounded" />
              <div className="w-14 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="flex flex-col gap-1">
          {events.map((event) => (
            <Link
              key={event._id}
              to={`/community/events/${event._id}`}
              className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-800 truncate group-hover:text-gray-900">
                  {event.eventName}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={9} className="text-gray-300" />
                  <p className="text-xs text-gray-400 truncate">{event.venue}</p>
                </div>
              </div>
              <div className="text-xs ml-3 flex-shrink-0">{dateLabel(event)}</div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-4">No upcoming events</p>
      )}
      <Link
        to="/community/events"
        className="flex items-center justify-center gap-1 w-full mt-4 py-2 text-xs font-medium text-gray-500 border border-gray-100 rounded-lg hover:border-gray-300 hover:text-gray-800 transition-colors"
      >
        View All Events <ChevronRight size={12} />
      </Link>
    </div>
  );
};

// ─── Popular Clubs ───────────────────────────────────────────
const TrendingClubsWidget = ({ clubs, loading }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-4">
      <Users size={14} className="text-gray-400" />
      <h3 className="text-sm font-semibold text-gray-900">Popular Clubs</h3>
    </div>
    {loading ? (
      <div className="flex flex-col gap-2 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <div className="w-24 h-3 bg-gray-100 rounded mb-1" />
              <div className="w-16 h-2 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    ) : clubs.length > 0 ? (
      <div className="flex flex-col gap-1">
        {clubs.map((club, i) => (
          <Link
            key={club._id}
            to={`/community/clubs/${club._id}`}
            className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors group"
          >
            <div className={`w-8 h-8 rounded-lg ${clubBg[i % clubBg.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden`}>
              {club.logo
                ? <img src={club.logo} alt="" className="w-full h-full object-cover" />
                : club.clubName?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate group-hover:text-gray-900">{club.clubName}</p>
              <p className="text-xs text-gray-400">{club.clubFollowers?.length ?? 0} followers</p>
            </div>
            <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
          </Link>
        ))}
      </div>
    ) : (
      <p className="text-xs text-gray-400 text-center py-4">No clubs yet</p>
    )}
    <Link
      to="/community/clubs"
      className="flex items-center justify-center gap-1 w-full mt-4 py-2 text-xs font-medium text-gray-500 border border-gray-100 rounded-lg hover:border-gray-300 hover:text-gray-800 transition-colors"
    >
      Explore Clubs <ChevronRight size={12} />
    </Link>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────
const Community = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [search,         setSearch]         = useState("");
  const [activeType,     setActiveType]     = useState("All");
  const [feedItems,      setFeedItems]      = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [trendingClubs,  setTrendingClubs]  = useState([]);
  const [feedLoading,    setFeedLoading]    = useState(true);
  const [widgetLoading,  setWidgetLoading]  = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFeedLoading(true);
        setWidgetLoading(true);
        const [feedRes, clubsRes, eventsRes] = await Promise.all([
          getCommunityFeed(),
          getPopularClubs(),
          getUpcomingEvents(),
        ]);

        const rawFeed  = feedRes?.data?.data || [];
        const safeFeed = rawFeed.filter((item) => {
          if (item.targetType === "club"  && !item.club)  return false;
          if (item.targetType === "event" && !item.event) return false;
          return true;
        });

        setFeedItems(safeFeed);
        setTrendingClubs(clubsRes?.data?.data  || []);
        setUpcomingEvents(eventsRes?.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setFeedLoading(false);
        setWidgetLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const types      = ["All", "club", "event"];
  const typeLabels = { All: "All", club: "Club Announcements", event: "Event Updates" };

  const filtered = feedItems.filter((item) => {
    const matchesType   = activeType === "All" || item.targetType === activeType;
    const sourceName    = item.targetType === "club" ? item.club?.clubName : item.event?.eventName;
    const matchesSearch = !search
      || item.title?.toLowerCase().includes(search.toLowerCase())
      || item.body?.toLowerCase().includes(search.toLowerCase())
      || sourceName?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleCardNavigation = (item) => {
    if (item.targetType === "event" && item.event?._id)
      navigate(`/community/events/${item.event._id}`);
    else if (item.targetType === "club" && item.club?._id)
      navigate(`/community/clubs/${item.club._id}`);
  };


  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150
                ${activeType === type
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"}`}
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex gap-6 items-start">
        {/* Left — Announcements feed */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            {!feedLoading && (
              <span className="text-xs text-gray-400">{filtered.length} updates</span>
            )}
          </div>

          {feedLoading ? (
            <FeedSkeleton />
          ) : filtered.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filtered.map((item) => (
                <AnnouncementCard
                  key={item._id}
                  announcement={item}
                  variant="feed"
                  onClick={() => handleCardNavigation(item)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-xl text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Megaphone size={16} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">No activity found</p>
              <p className="text-xs text-gray-400">
                {search ? `No results for "${search}"` : "Nothing here yet"}
              </p>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 sticky top-4">

          {/* 1. Community Notices — TOP PRIORITY */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <NoticeFeed
              targetType="community"
              compact={true}
              title="Your Notices"
              canPost={false}
              showActions={false}
            />
          </div>

          {/* 2. Upcoming Events */}
          <UpcomingEventsWidget events={upcomingEvents} loading={widgetLoading} />

          {/* 3. Popular Clubs */}
          <TrendingClubsWidget clubs={trendingClubs} loading={widgetLoading} />
        </div>
      </div>
    </div>
  );
};

export default Community;