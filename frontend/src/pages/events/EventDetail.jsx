import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  Plus,
  Edit3,
  ChevronRight,
  Activity,
  Megaphone,
  Loader2,
} from "lucide-react";
import { getEventById, registerForEvent } from "../../api/event.api";
import {
  getAnnouncements,
  deleteAnnouncement,
} from "../../api/announcement.api";
import NoticeFeed from "../../components/cards/NoticeFeed";
import useAuth from "../../hooks/useAuth";
import AnnouncementCard from "../announcements/AnnouncementCard";

const categoryColor = {
  Technical: "text-blue-700 bg-blue-50 border-blue-100/60",
  Cultural: "text-purple-700 bg-purple-50 border-purple-100/60",
  Creative: "text-orange-700 bg-orange-50 border-orange-100/60",
  Business: "text-green-700 bg-green-50 border-green-100/60",
  Sports: "text-emerald-700 bg-emerald-50 border-emerald-100/60",
};

const statusConfig = {
  Upcoming: {
    color: "bg-emerald-50 text-emerald-700 border-emerald-100/60",
    dot: "bg-emerald-500",
  },
  Ongoing: {
    color: "bg-blue-50 text-blue-700 border-blue-100/60",
    dot: "bg-blue-500 animate-pulse",
  },
  Completed: {
    color: "bg-slate-100 text-slate-500 border-slate-200/60",
    dot: "bg-slate-400",
  },
  Cancelled: {
    color: "bg-red-50 text-red-600 border-red-100/60",
    dot: "bg-red-500",
  },
};

const formatEventSchedule = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr)
    return { isMultiDay: false, dateLabel: "—", timeLabel: "—" };

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const dateOpts = { day: "2-digit", month: "short", year: "numeric" };
  const timeOpts = { hour: "2-digit", minute: "2-digit", hour12: false };

  const isMultiDay = start.toDateString() !== end.toDateString();

  if (isMultiDay) {
    return {
      isMultiDay: true,
      startLabel: `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} • ${start.toLocaleTimeString("en-IN", timeOpts)}`,
      endLabel: `${end.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} • ${end.toLocaleTimeString("en-IN", timeOpts)}`,
    };
  }

  return {
    isMultiDay: false,
    dateLabel: start.toLocaleDateString("en-IN", dateOpts),
    timeLabel: `${start.toLocaleTimeString("en-IN", timeOpts)} - ${end.toLocaleTimeString("en-IN", timeOpts)}`,
  };
};

const Skeleton = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-pulse space-y-6">
    {/* Return link row skeleton */}
    <div className="w-24 h-4 bg-slate-100 rounded-lg" />

    {/* Notice block row skeleton */}
    <div className="h-14 bg-slate-50/50 border border-slate-100 rounded-2xl" />

    {/* Banner box card skeleton */}
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-3xs space-y-5 pb-5">
      <div className="h-44 sm:h-48 bg-slate-100" />
      <div className="px-5 space-y-3">
        <div className="w-20 h-4 bg-slate-100 rounded-md" />
        <div className="w-2/3 h-5 bg-slate-100 rounded-lg" />
        <div className="w-32 h-3 bg-slate-50 rounded" />
        <div className="grid grid-cols-3 gap-3.5 pt-2">
          <div className="h-10 bg-slate-50 rounded-xl" />
          <div className="h-10 bg-slate-50 rounded-xl" />
          <div className="h-10 bg-slate-50 rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [event, setEvent] = useState(null);
  const [feedItems, setFeedItems] = useState([]); // ── Standardized variable naming
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination & Load States
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [isOrganizer, setIsOrganizer] = useState(false);

  // 1. Core Fetch Thread Method
  const fetchAnnouncementsFeed = useCallback(
    async (currentOffset = 0, append = false) => {
      try {
        if (append) setLoadMoreLoading(true);
        else setFeedLoading(true);

        const res = await getAnnouncements("event", id, currentOffset);
        const {
          announcements = [],
          hasMore: nextHasMore,
          nextOffset,
        } = res?.data?.data || {};

        setFeedItems((prev) =>
          append ? [...prev, ...announcements] : announcements,
        );
        setHasMore(nextHasMore);
        setOffset(nextOffset);
      } catch (err) {
        console.error("Failed to load announcements:", err);
      } finally {
        setFeedLoading(false);
        setLoadMoreLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        const eventRes = await getEventById(id);
        const data = eventRes?.data?.data.event;
        setEvent(data);
        setIsOrganizer(eventRes.data.data.isOrganizer);

        if (
          user &&
          user?.registeredEvents?.some((eventId) => (eventId._id ?? eventId) === data._id)
        ) {
          setRegistered(true);
        }

        // Load first page of announcements
        fetchAnnouncementsFeed(0, false);
      } catch {
        setError("Event details offline.");
      } finally {
        setLoading(false);
      }
    };
    fetchEventData();
  }, [id, user, fetchAnnouncementsFeed]);

  const handleLoadMore = () => {
    if (!loadMoreLoading && hasMore) {
      fetchAnnouncementsFeed(offset, true);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    setRegisterError("");
    try {
      const payload = await registerForEvent(id);
      setEvent(payload.data.data.event);
      // The server registers atomically and returns only the event; mirror the
      // registration into the cached user.
      setUser((prev) =>
        prev ? { ...prev, registeredEvents: [...(prev.registeredEvents || []), id] } : prev,
      );
      setRegistered(true);
    } catch (err) {
      setRegisterError(err.response?.data?.message || "Registration failed.");
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    try {
      await deleteAnnouncement(annId);
      setFeedItems((prev) => prev.filter((a) => a._id !== annId));
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <Skeleton />;
  if (error || !event)
    return (
      <div className="text-center py-20 text-xs font-semibold text-slate-400">
        {error || "Asset node offline."}
      </div>
    );

  const computedStatus =
    event.status === "Cancelled"
      ? "Cancelled"
      : new Date() < new Date(event.startDateTime)
        ? "Upcoming"
        : new Date() <= new Date(event.endDateTime)
          ? "Ongoing"
          : "Completed";
  const catStyle =
    categoryColor[event.category] ||
    "text-slate-600 bg-slate-100 border-slate-200";
  const statusCfg = statusConfig[computedStatus] || statusConfig.Upcoming;
  const schedule = formatEventSchedule(event.startDateTime, event.endDateTime);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2 space-y-6">
      {/* Upper Navigation Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={13} /> Return to Timelines
        </button>

        {(isOrganizer || user?.role === "superadmin") && (
          <div className="flex items-center gap-2">
            <Link
              to={`/events/${id}/create-notice`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-slate-200 text-slate-600 rounded-xl hover:border-slate-400 hover:text-slate-900 bg-white shadow-3xs transition-all"
            >
              <Plus size={12} /> Post Notice
            </Link>
            <button
              onClick={() =>
                navigate(`/community/events/${id}/edit`, { state: { event } })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-slate-200 text-slate-600 rounded-xl hover:border-slate-400 hover:text-slate-900 bg-white shadow-3xs transition-all"
            >
              <Edit3 size={12} /> Edit Event
            </button>
            <Link
              to={`/community/event/${id}/announcements/create`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-3xs transition-all"
            >
              <Plus size={12} /> Post Update
            </Link>
          </div>
        )}
      </div>

      {/* ── CENTRAL CRITICAL NOTICE BOARD STREAM (TOP PRIORITY) ── */}
      <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-2.5 shadow-3xs">
        <NoticeFeed
          targetType="events"
          targetId={id}
          title="Event Notices "
          canPost={isOrganizer}
          showActions={isOrganizer}
          compact={true}
        />
      </div>

      {/* Main Metadata Display Billboard */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
        <div className="h-40 sm:h-48 bg-slate-50 relative overflow-hidden border-b border-slate-100">
          {event.banner ? (
            <img
              src={event.banner}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center opacity-90">
              <Activity size={24} className="text-white/10" />
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase ${catStyle}`}
            >
              {event.category}
            </span>
            <span
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusCfg.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {computedStatus}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
              {event.eventName}
            </h1>
            {event.organizerClub && (
              <p className="text-xs font-semibold text-slate-400">
                by{" "}
                <span className="text-slate-600 font-bold underline decoration-slate-200">
                  {event.organizerClub.clubName}
                </span>
              </p>
            )}
          </div>

          {/* Quick Info Param Rows */}
          {(() => {
            const schedule = formatEventSchedule(
              event.startDateTime,
              event.endDateTime,
            );

            // ✅ Dynamically structuralize items based on timeline spans
            const gridItems = schedule.isMultiDay
              ? [
                  {
                    icon: Calendar,
                    label: "Event Starts",
                    value: schedule.startLabel,
                  },
                  {
                    icon: Clock,
                    label: "Event Ends",
                    value: schedule.endLabel,
                  },
                  {
                    icon: MapPin,
                    label: "Venue Placement",
                    value: event.venue || "Campus Grounds",
                  },
                ]
              : [
                  { icon: Calendar, label: "Date", value: schedule.dateLabel },
                  {
                    icon: Clock,
                    label: "Schedule Window",
                    value: schedule.timeLabel,
                  },
                  {
                    icon: MapPin,
                    label: "Venue Placement",
                    value: event.venue || "Campus Grounds",
                  },
                ];

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-slate-50 text-xs font-medium text-slate-500">
                {gridItems.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 bg-slate-50/60 border border-slate-100/80 rounded-xl p-2.5"
                  >
                    <Icon size={14} className="text-slate-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        {label}
                      </span>
                      <span className="text-slate-700 font-bold truncate block max-w-[180px]">
                        {value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Registration Trigger Handle Box */}
          <div className="pt-2">
            {registered ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700">
                ✓ Enrolled & Secured
              </div>
            ) : computedStatus === "Completed" ||
              computedStatus === "Cancelled" ? (
              <div className="inline-flex items-center px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-400">
                Timeline Closed
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-3xs flex items-center gap-2"
                >
                  {registering && (
                    <Loader2 size={12} className="animate-spin" />
                  )}
                  Submit Enrollment
                </button>
                {registerError && (
                  <p className="text-[11px] text-red-500 font-semibold">
                    {registerError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description Segment */}
      {event.description && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs space-y-1.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Event Overview
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        </div>
      )}

      {/* ── BROADCAST ANNOUNCEMENTS STREAM WITH PAGINATION (LOAD MORE) ── */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 px-1">
          <Megaphone size={14} className="text-slate-400" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Broadcast Stream Logs
          </h2>
        </div>

        {feedLoading && feedItems.length === 0 ? (
          <div className="h-24 bg-slate-50 border border-slate-100 animate-pulse rounded-2xl" />
        ) : feedItems.length > 0 ? (
          <div className="space-y-3">
            {feedItems.map((a) => (
              <AnnouncementCard
                key={a._id}
                announcement={a}
                variant="detail"
                onDelete={handleDeleteAnnouncement}
                isEligible={isOrganizer}
              />
            ))}

            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadMoreLoading}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                {loadMoreLoading ? (
                  <>
                    <Loader2
                      size={13}
                      className="animate-spin text-slate-400"
                    />{" "}
                    Appending Stream...
                  </>
                ) : (
                  "Load More Logs"
                )}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs font-medium text-slate-400 py-12 text-center bg-white border border-slate-100 rounded-2xl shadow-3xs">
            No active updates published onto this stream.
          </p>
        )}
      </div>
    </div>
  );
}
