import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Calendar,
  MapPin,
  Users,
  ChevronRight,
  Bell,
  Megaphone,
  Trophy,
  Briefcase,
  Radio,
} from "lucide-react";
import { getCommunityFeed } from "../api/announcement.api";
import { getPopularClubs } from "../api/club.api";
import { getUpcomingEvents } from "../api/event.api";
import useAuth from "../hooks/useAuth";
import NoticeFeed from "../components/cards/NoticeFeed";

// ─── Helpers ──────────────────────────────────────────────────
const relativeTime = (d) => {
  if (!d) return "—";
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
};

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "—";

const clubBg = [
  "bg-gray-900",
  "bg-blue-600",
  "bg-purple-600",
  "bg-green-600",
  "bg-orange-500",
  "bg-rose-600",
];

const clubInitials = (name) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

// ─── Normalize Backend Announcement → Feed Item ───────────────
const normalizeAnnouncement = (a) => {
  if (!a) return null;

  const isClub = a.targetType === "club";
  const isEvent = a.targetType === "event";

  // Prevent runtime evaluation crashes if referenced parent entries are null
  const sourceName = isClub
    ? a.club?.clubName || "Unknown Club"
    : isEvent
      ? a.event?.eventName || "Unknown Event"
      : "System Update";

  const sourceId = isClub ? a.club?._id : isEvent ? a.event?._id : null;

  return {
    _id: a._id,
    title: a.title || "Untitled Notice",
    preview: a.body || "",
    image: a.image || null,
    createdAt: a.createdAt,
    targetType: a.targetType,
    source: sourceName,
    sourceId: sourceId,
    type: isEvent ? "Event Update" : "Club Announcement",
  };
};

// ─── Feed Type Config ─────────────────────────────────────────
const typeConfig = {
  "Event Update": { icon: Radio, color: "bg-purple-50 text-purple-700" },
  "Club Announcement": { icon: Megaphone, color: "bg-blue-50 text-blue-700" },
  Recruitment: { icon: Briefcase, color: "bg-green-50 text-green-700" },
  Achievement: { icon: Trophy, color: "bg-amber-50 text-amber-700" },
};

// ─── Notice Stripe ────────────────────────────────────────────
const NoticeStripe = ({ notice, onDismiss }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg mb-6">
    <div className="flex items-center gap-2.5 text-amber-800">
      <Bell size={13} className="flex-shrink-0 text-amber-500" />
      <span className="text-xs">
        <span className="font-medium">{notice.postedBy}:</span> {notice.message}
      </span>
    </div>
    <button
      onClick={onDismiss}
      className="flex-shrink-0 text-amber-400 hover:text-amber-700 transition-colors"
    >
      <X size={13} />
    </button>
  </div>
);

// ─── Feed Card ────────────────────────────────────────────────
const FeedCard = ({ item }) => {
  const navigate = useNavigate();
  const config = typeConfig[item.type] || typeConfig["Club Announcement"];
  const Icon = config.icon;

  const handleClick = () => {
    if (!item.sourceId) return;
    if (item.targetType === "event")
      navigate(`/community/events/${item.sourceId}`);
    else navigate(`/community/clubs/${item.sourceId}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config.color}`}
        >
          <Icon size={11} />
          {item.type}
        </span>
        <span className="text-xs text-gray-400">
          {relativeTime(item.createdAt)}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mb-1.5 leading-snug group-hover:text-gray-700 transition-colors">
        {item.title}
      </h3>

      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
        {item.preview}
      </p>

      {item.image && (
        <div className="mb-3 rounded-lg overflow-hidden border border-gray-100">
          <img
            src={item.image}
            alt=""
            className="w-full max-h-40 object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <div
          className={`w-4 h-4 rounded ${clubBg[0]} flex items-center justify-center text-white font-bold flex-shrink-0`}
          style={{ fontSize: "7px" }}
        >
          {clubInitials(item.source)}
        </div>
        <span className="text-xs font-medium text-gray-500">{item.source}</span>
      </div>
    </div>
  );
};

// ─── Feed Skeleton ────────────────────────────────────────────
const FeedSkeleton = () => (
  <div className="flex flex-col gap-3">
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse"
      >
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

// ─── Upcoming Events Widget ───────────────────────────────────
const UpcomingEventsWidget = ({ events, loading }) => {
  const isToday = (d) =>
    d && new Date(d).toDateString() === new Date().toDateString();
  const isTomorrow = (d) => {
    if (!d) return false;
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return new Date(d).toDateString() === t.toDateString();
  };
  const isOngoing = (event) => {
    if (!event.startDateTime || !event.endDateTime) return false;

    const now = new Date();

    return (
      now >= new Date(event.startDateTime) && now <= new Date(event.endDateTime)
    );
  };

  const dateLabel = (event) => {
    const d = event.startDateTime;

    if (!d) return "—";

    if (isOngoing(event))
      return <span className="text-blue-600 font-medium">Ongoing</span>;

    if (isToday(d))
      return <span className="text-emerald-600 font-medium">Today</span>;

    if (isTomorrow(d))
      return <span className="text-amber-600 font-medium">Tomorrow</span>;

    return (
      <span className="text-gray-400 font-mono">
        {new Date(d).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })}
      </span>
    );
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
                  <p className="text-xs text-gray-400 truncate">
                    {event.venue}
                  </p>
                </div>
              </div>
              <div className="text-xs ml-3 flex-shrink-0">
                {dateLabel(event)}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-4">
          No upcoming events
        </p>
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

// ─── Trending Clubs Widget ────────────────────────────────────
const TrendingClubsWidget = ({ clubs, loading }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-4">
      <Users size={14} className="text-gray-400" />
      <h3 className="text-sm font-semibold text-gray-900">Trending Clubs</h3>
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
            <div
              className={`w-8 h-8 rounded-lg ${clubBg[i % clubBg.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
            >
              {club.logo ? (
                <img
                  src={club.logo}
                  alt=""
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                clubInitials(club.clubName)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate group-hover:text-gray-900">
                {club.clubName}
              </p>
              <p className="text-xs text-gray-400">
                {club.clubFollowers?.length ?? 0} followers
              </p>
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

// ─── Main Page Component ──────────────────────────────────────
const Community = () => {
  const { user } = useAuth();

  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("All");
  const [feedItems, setFeedItems] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [trendingClubs, setTrendingClubs] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [widgetLoading, setWidgetLoading] = useState(true);

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

        const rawFeed = feedRes?.data?.data || [];

        // Map defensively and filter out entries without a clean source mapping target
        const processedFeed = rawFeed
          .map(normalizeAnnouncement)
          .filter((item) => item !== null && item.sourceId !== null);

        setFeedItems(processedFeed);
        setTrendingClubs(clubsRes?.data?.data || []);
        setUpcomingEvents(eventsRes?.data?.data || []);
        // console.log(eventsRes?.data?.data || []);
      } catch (error) {
        console.error("Critical error in data fetch pipeline:", error);
      } finally {
        setFeedLoading(false);
        setWidgetLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const types = ["All", "Event Update", "Club Announcement"];

  const filtered = feedItems.filter((item) => {
    const matchesType = activeType === "All" || item.type === activeType;
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.source.toLowerCase().includes(search.toLowerCase()) ||
      item.preview.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Notice Stripe */}
      {/* //here we are gonna fetch the notices from the events and clubs the user is registered for or following/joined clubs */}
      <NoticeFeed targetType="community" compact={true} title="Community Notices" />

      {/* Search + Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative w-full sm:w-72">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search activity..."
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

        <div className="flex items-center gap-1.5 flex-wrap">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150
                ${
                  activeType === type
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Layout Grid View */}
      <div className="flex gap-6 items-start">
        {/* Left Column — Activity Feed */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent Activity
            </h2>
            {!feedLoading && (
              <span className="text-xs text-gray-400">
                {filtered.length} updates
              </span>
            )}
          </div>

          {feedLoading ? (
            <FeedSkeleton />
          ) : filtered.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filtered.map((item) => (
                <FeedCard key={item._id} item={item} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-xl text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Megaphone size={16} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                No activity found
              </p>
              <p className="text-xs text-gray-400">
                {search ? `No results for "${search}"` : "Nothing here yet"}
              </p>
            </div>
          )}
        </div>

        {/* Right Column — Sidebar Widgets */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 sticky top-4">
          <UpcomingEventsWidget
            events={upcomingEvents}
            loading={widgetLoading}
          />
          <TrendingClubsWidget clubs={trendingClubs} loading={widgetLoading} />
        </div>
      </div>
    </div>
  );
};

export default Community;
