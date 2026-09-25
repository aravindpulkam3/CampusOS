import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  MapPin,
  Clock,
  Calendar,
  Plus,
  Megaphone,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Shield,
  Bell,
  BellOff,
  Loader2,
} from "lucide-react";
import {
  followClub,
  unfollowClub,
  getClubDetails,
  muteClub,
  unmuteClub,
} from "../../api/club.api";
import {
  getAnnouncements,
  deleteAnnouncement,
} from "../../api/announcement.api";
import useAuth from "../../hooks/useAuth";
import useIsClamped from "../../hooks/useIsClamped";
import useImageOk from "../../hooks/useImageOk";
import { focusRing, SectionHeader, ManageLink } from "../../components/common/SectionBits";
import NoticeFeed from "../../components/cards/NoticeFeed";
import AnnouncementCard from "../announcements/AnnouncementCard";

// ─── Helpers ──────────────────────────────────────────────────
const clubBg = [
  "bg-slate-900",
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-rose-600",
];

// Same map as the Clubs list, so a club's chip looks identical on both pages.
const categoryColor = {
  Technical: "bg-blue-50 text-blue-700 border-blue-100",
  Cultural: "bg-purple-50 text-purple-700 border-purple-100",
  Creative: "bg-orange-50 text-orange-700 border-orange-100",
  Business: "bg-green-50 text-green-700 border-green-100",
  Sports: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

// No display class here: callers add one, so `hidden sm:inline-flex` can't be
// overridden by a display utility baked into the base.
const chipBase =
  "items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap";

const clubInitials = (name) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Ids arrive either bare or populated.
const idOf = (x) => String(x?._id ?? x);

const formatDay = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
  });
};

const formatTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const formatShortDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const formatEventWhen = (start, end) =>
  new Date(start).toDateString() === new Date(end).toDateString()
    ? `${formatDay(start)} · ${formatTime(start)}–${formatTime(end)}`
    : `${formatDay(start)} – ${formatDay(end)}`;

// Mirrors the backend rule: registration closes at the earlier of the
// deadline and the start.
const registrationCutoff = (event) => {
  const start = new Date(event.startDateTime);
  if (!event.registrationDeadline) return start;
  const deadline = new Date(event.registrationDeadline);
  return deadline < start ? deadline : start;
};

const eventStatus = (event, registered, now) => {
  if (event.status === "Cancelled")
    return { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-100/60" };
  if (new Date(event.endDateTime) < now) return null;
  if (registered)
    return { label: "Registered", color: "bg-emerald-50 text-emerald-700 border-emerald-100/60" };
  if (new Date(event.startDateTime) <= now)
    return {
      label: "Happening now",
      color: "bg-blue-50 text-blue-700 border-blue-100/60",
      dot: "bg-blue-500",
    };
  const cutoff = registrationCutoff(event);
  if (cutoff > now) {
    const soon = cutoff - now < 2 * 24 * 60 * 60 * 1000;
    return {
      label: `Registration closes ${formatShortDate(cutoff)}`,
      color: soon
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-slate-50 text-slate-600 border-slate-200/70",
    };
  }
  return { label: "Registration closed", color: "bg-slate-50 text-slate-500 border-slate-200/70" };
};

// ─── Small building blocks ────────────────────────────────────
const Skeleton = () => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 space-y-5 animate-pulse">
    <div className="w-12 h-3 bg-slate-200 rounded" />
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      <div className="h-24 sm:h-32 bg-slate-100" />
      <div className="px-4 sm:px-5 pb-5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 -mt-8 sm:-mt-10 rounded-2xl bg-slate-200 border-4 border-white" />
        <div className="mt-3 w-48 h-5 bg-slate-100 rounded" />
        <div className="mt-2 w-64 max-w-full h-3 bg-slate-100 rounded" />
      </div>
    </div>
    <div className="h-28 bg-white border border-slate-100 rounded-2xl" />
    <div className="h-20 bg-white border border-slate-100 rounded-2xl" />
    <div className="h-48 bg-white border border-slate-100 rounded-2xl" />
  </div>
);

const StatusChip = ({ status, className = "" }) => (
  <span className={`${chipBase} ${status.color} ${className || "inline-flex"}`}>
    {status.dot && <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />}
    {status.label}
  </span>
);

const EventRow = ({ event, status, past = false }) => {
  const start = new Date(event.startDateTime);
  const [showBanner, onBannerError] = useImageOk(event.banner);
  return (
    <li>
      <Link
        to={`/community/events/${event._id}`}
        className="group flex items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-slate-50/70 focus-visible:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900/15 transition-colors"
      >
        {/* Event banner as the thumbnail; the date tile stands in when there is none. */}
        <div
          className={`w-20 h-14 sm:w-24 sm:h-16 flex-shrink-0 rounded-xl border overflow-hidden flex flex-col items-center justify-center ${
            past ? "border-slate-100 bg-slate-50/60" : "border-slate-200 bg-white"
          }`}
        >
          {showBanner ? (
            <img
              src={event.banner}
              alt=""
              loading="lazy"
              onError={onBannerError}
              className={`w-full h-full object-cover ${past ? "opacity-70" : ""}`}
            />
          ) : (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {start.toLocaleDateString("en-IN", { month: "short" })}
              </div>
              <div
                className={`text-lg font-black leading-none mt-0.5 ${
                  past ? "text-slate-500" : "text-slate-800"
                }`}
              >
                {start.getDate()}
              </div>
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold truncate transition-colors group-hover:text-blue-600 ${
              past ? "text-slate-500" : "text-slate-800"
            }`}
          >
            {event.eventName}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={11} className="text-slate-400 flex-shrink-0" />
              {formatEventWhen(event.startDateTime, event.endDateTime)}
            </span>
            {event.venue && (
              <span className="flex items-center gap-1 min-w-0">
                <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{event.venue}</span>
              </span>
            )}
          </div>
          {status && <StatusChip status={status} className="mt-1.5 inline-flex sm:hidden" />}
        </div>

        {status && <StatusChip status={status} className="hidden sm:inline-flex flex-shrink-0" />}
        <ChevronRight
          size={14}
          className="flex-shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
        />
      </Link>
    </li>
  );
};

// ─── Page ─────────────────────────────────────────────────────
const ClubDetail = () => {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [club, setClub] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [pastEventCount, setPastEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // "notFound" | "failed"
  const [reloadKey, setReloadKey] = useState(0);
  const [followPending, setFollowPending] = useState(false);
  const [mutePending, setMutePending] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);

  // Announcements page through their own endpoint, 10 at a time.
  const [announcements, setAnnouncements] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const activeClubRef = useRef(clubId);

  const [showClubBanner, onClubBannerError] = useImageOk(club?.banner);
  const [showLogo, onLogoError] = useImageOk(club?.logo);

  const descriptionRef = useRef(null);
  const descriptionClamped = useIsClamped(
    descriptionRef,
    !aboutExpanded,
    club?.description,
  );

  // Fetched per club only: follow/mute update the user in context, and the
  // page derives its state from that instead of refetching.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setAboutExpanded(false);
    getClubDetails(clubId)
      .then((payload) => {
        if (cancelled) return;
        const data = payload.data.data;
        setClub(data.club);
        setIsAdmin(data.isAdmin);
        setUpcomingEvents(data.upcomingEvents || []);
        setPastEvents(data.pastEvents || []);
        setPastEventCount(data.pastEventCount ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        const status = err.response?.status;
        setLoadError(status === 404 || status === 400 ? "notFound" : "failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, reloadKey]);

  const fetchAnnouncements = useCallback(
    async (fromOffset, append) => {
      const requestedClub = clubId;
      if (append) setLoadMoreLoading(true);
      else setFeedLoading(true);
      setFeedError(false);
      try {
        const res = await getAnnouncements("club", clubId, fromOffset);
        if (activeClubRef.current !== requestedClub) return;
        const { announcements: page = [], hasMore: more, nextOffset } =
          res?.data?.data || {};
        setAnnouncements((prev) => (append ? [...prev, ...page] : page));
        setHasMore(more);
        setOffset(nextOffset);
      } catch (err) {
        if (activeClubRef.current !== requestedClub) return;
        console.error("Failed to load announcements:", err);
        setFeedError(true);
      } finally {
        if (activeClubRef.current === requestedClub) {
          setFeedLoading(false);
          setLoadMoreLoading(false);
        }
      }
    },
    [clubId],
  );

  useEffect(() => {
    activeClubRef.current = clubId;
    setAnnouncements([]);
    setHasMore(false);
    fetchAnnouncements(0, false);
  }, [clubId, fetchAnnouncements]);

  // Derived from the user in context, which the follow/mute handlers update.
  const isFollowing = !!user?.followedClubs?.some((id) => idOf(id) === clubId);
  const isMuted = !!user?.mutedClubs?.some((id) => idOf(id) === clubId);

  // Each control sends the desired state and stays disabled until its request
  // settles, so an older response can never land after a newer one.
  const handleFollowButton = async () => {
    if (followPending) return;
    setFollowPending(true);
    try {
      const payload = await (isFollowing ? unfollowClub : followClub)(clubId);
      const { club: updated, user: updatedUser } = payload.data.data;
      // The response's club is unpopulated; keep ours and take the new count.
      setClub((prev) => ({ ...prev, followerCount: updated.followerCount }));
      setUser(updatedUser);
    } catch (error) {
      console.error(error);
    } finally {
      setFollowPending(false);
    }
  };

  const handleMuteButton = async () => {
    if (mutePending) return;
    setMutePending(true);
    try {
      const payload = await (isMuted ? unmuteClub : muteClub)(clubId);
      const nowMuted = payload.data.data.isMuted;
      setUser((prev) => {
        const others = (prev.mutedClubs || []).filter((id) => id.toString() !== clubId);
        return { ...prev, mutedClubs: nowMuted ? [...others, clubId] : others };
      });
    } catch (error) {
      console.error(error);
    } finally {
      setMutePending(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
      // Everything after it shifted up one; keep the next page from skipping an item.
      setOffset((o) => Math.max(0, o - 1));
    } catch (error) {
      console.error(error);
    }
  };

  const handleLoadMore = () => {
    if (!loadMoreLoading && hasMore) fetchAnnouncements(offset, true);
  };

  if (loading) return <Skeleton />;
  if (loadError || !club)
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          {loadError === "failed" ? "Couldn't load this club" : "Club not found"}
        </p>
        <p className="text-xs text-slate-500">
          {loadError === "failed"
            ? "Check your connection and try again."
            : "It may have been removed, or the link is incorrect."}
        </p>
        {loadError === "failed" ? (
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 transition-colors ${focusRing}`}
          >
            Try again
          </button>
        ) : (
          <Link
            to="/community/clubs"
            className={`inline-block px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 transition-colors ${focusRing}`}
          >
            Back to clubs
          </Link>
        )}
      </div>
    );

  const coreTeam = club.clubAdmins || [];
  const isCoreMember = !!user && coreTeam.some((m) => idOf(m) === String(user._id));
  const registeredIds = new Set((user?.registeredEvents || []).map(idOf));
  const now = new Date();
  const bgClass = clubBg[club.clubName?.charCodeAt(0) % clubBg.length];
  const shownTeam = coreTeam.slice(0, 6);
  const hiddenTeamCount = coreTeam.length - shownTeam.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 space-y-5">
      <button
        onClick={() => navigate(-1)}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded transition-colors ${focusRing}`}
      >
        <ArrowLeft size={13} /> Back
      </button>

      {/* ── Header ── */}
      <header className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div
          className={`${showClubBanner ? "h-28 sm:h-40" : "h-14 sm:h-16"} bg-slate-100 border-b border-slate-100`}
        >
          {showClubBanner && (
            <img
              src={club.banner}
              alt=""
              onError={onClubBannerError}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="px-4 sm:px-5 pb-4">
          <div className="flex items-end justify-between gap-3">
            {/* relative: without it the banner image paints over the logo's
                border and backdrop where they overlap. */}
            <div
              className={`relative w-16 h-16 sm:w-20 sm:h-20 -mt-8 sm:-mt-10 rounded-2xl border-4 border-white ${
                showLogo ? "bg-white" : bgClass
              } flex items-center justify-center text-white text-xl sm:text-2xl font-black overflow-hidden flex-shrink-0`}
            >
              {showLogo ? (
                <img
                  src={club.logo}
                  alt={`${club.clubName} logo`}
                  onError={onLogoError}
                  className="w-full h-full object-contain"
                />
              ) : (
                clubInitials(club.clubName)
              )}
            </div>

            <div className="flex items-center gap-2 pt-3">
              {isFollowing && (
                <button
                  onClick={handleMuteButton}
                  disabled={mutePending}
                  aria-label={isMuted ? "Unmute notifications from this club" : "Mute notifications from this club"}
                  title={isMuted ? "Unmute notifications" : "Mute notifications"}
                  className={`p-2 rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-400 hover:text-slate-900 disabled:opacity-60 disabled:cursor-wait ${
                    isMuted ? "text-slate-400" : "text-slate-600"
                  } ${focusRing}`}
                >
                  {isMuted ? <BellOff size={14} /> : <Bell size={14} />}
                </button>
              )}
              <button
                onClick={handleFollowButton}
                disabled={followPending}
                className={`group/follow min-w-[88px] px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors disabled:opacity-60 disabled:cursor-wait ${focusRing} ${
                  isFollowing
                    ? "border-slate-200 text-slate-600 bg-white hover:border-red-200 hover:text-red-500 hover:bg-red-50/40"
                    : "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {isFollowing ? (
                  <>
                    <span className="group-hover/follow:hidden">Following</span>
                    <span className="hidden group-hover/follow:inline">Unfollow</span>
                  </>
                ) : (
                  "Follow"
                )}
              </button>
            </div>
          </div>

          <div className="mt-3 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight break-words">
              {club.clubName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-slate-500">
              {club.category && (
                <span
                  className={`inline-flex ${chipBase} ${categoryColor[club.category] || "bg-slate-50 text-slate-600 border-slate-200"}`}
                >
                  {club.category}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users size={12} className="text-slate-400" />
                {club.followerCount ?? 0} {club.followerCount === 1 ? "follower" : "followers"}
              </span>
              <span className="flex items-center gap-1">
                <Shield size={12} className="text-slate-400" />
                {coreTeam.length} core {coreTeam.length === 1 ? "member" : "members"}
              </span>
              {isCoreMember && (
                <span className={`inline-flex ${chipBase} bg-slate-900 text-white border-slate-900`}>
                  Core member
                </span>
              )}
              {!club.isActive && (
                <span className={`inline-flex ${chipBase} bg-amber-50 text-amber-700 border-amber-100`}>
                  Pending approval
                </span>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-1 px-3 sm:px-4 py-2 border-t border-slate-100 bg-slate-50/60">
            <span className="px-1.5 mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Manage
            </span>
            <ManageLink to={`/clubs/${clubId}/create-notice`} icon={Plus}>
              Post notice
            </ManageLink>
            <ManageLink to={`/community/club/${clubId}/announcements/create`} icon={Plus}>
              Post announcement
            </ManageLink>
            <ManageLink to={`/community/clubs/${clubId}/events/create`} icon={Plus}>
              Create event
            </ManageLink>
            <ManageLink
              to={`/community/clubs/${clubId}/edit`}
              state={{ club, isAdmin }}
              icon={Pencil}
            >
              Edit club
            </ManageLink>
          </div>
        )}
      </header>

      {/* ── About ── */}
      <section
        aria-labelledby="club-about"
        className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="md:col-span-2 min-w-0">
            <h2 id="club-about" className="text-sm font-semibold text-slate-800 mb-1.5">
              About
            </h2>
            {club.description ? (
              <>
                <p
                  ref={descriptionRef}
                  className={`text-[13px] text-slate-600 leading-relaxed whitespace-pre-line break-words ${
                    aboutExpanded ? "" : "line-clamp-4"
                  }`}
                >
                  {club.description}
                </p>
                {descriptionClamped && (
                  <button
                    onClick={() => setAboutExpanded((v) => !v)}
                    aria-expanded={aboutExpanded}
                    className={`mt-1.5 flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 rounded transition-colors ${focusRing}`}
                  >
                    {aboutExpanded ? (
                      <>
                        Show less <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        Show more <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">No description yet.</p>
            )}
          </div>

          <dl className="space-y-3 text-xs pt-4 border-t border-slate-100 md:pt-0 md:border-t-0 md:border-l md:pl-6">
            {club.createdAt && (
              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium text-slate-500">Created</dt>
                <dd className="font-semibold text-slate-700">
                  {new Date(club.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
            {coreTeam.length > 0 && (
              <div>
                <dt className="font-medium text-slate-500 mb-2">Core team</dt>
                <dd>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {shownTeam.map((member, i) => (
                      <li key={idOf(member)} className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg ${clubBg[i % clubBg.length]} flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0`}
                        >
                          {member.profilePicture ? (
                            <img src={member.profilePicture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`
                          )}
                        </div>
                        <span className="font-semibold text-slate-700 truncate">
                          {member.firstName} {member.lastName}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {hiddenTeamCount > 0 && (
                    <p className="mt-2 text-[11px] font-medium text-slate-500">
                      +{hiddenTeamCount} more
                    </p>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {/* ── Notices ── can be urgent, so they sit above events and announcements
          at every width, in the same highlighted card EventDetail uses. */}
      <section
        aria-label="Club noticeboard"
        className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-4"
      >
        <NoticeFeed
          targetType="clubs"
          targetId={clubId}
          title="Noticeboard"
          canPost={isAdmin}
          showActions={isAdmin}
          compact={true}
        />
      </section>

      <section
        aria-labelledby="club-events"
        className="min-w-0"
      >
        <SectionHeader
          id="club-events"
          icon={Calendar}
          title="Events"
          count={upcomingEvents.length}
        />
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          {pastEvents.length > 0 && (
            <h3 className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Upcoming
            </h3>
          )}
          {upcomingEvents.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {upcomingEvents.map((event) => (
                <EventRow
                  key={event._id}
                  event={event}
                  status={eventStatus(event, registeredIds.has(idOf(event._id)), now)}
                />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-xs text-slate-500">No upcoming events.</p>
          )}

          {pastEvents.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-3 px-4 py-2 border-y border-slate-100 bg-slate-50/60">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Past
                </h3>
                {pastEventCount > pastEvents.length && (
                  <span className="text-[11px] font-medium text-slate-500">
                    Latest {pastEvents.length} of {pastEventCount}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-slate-100">
                {pastEvents.map((event) => (
                  <EventRow
                    key={event._id}
                    event={event}
                    status={eventStatus(event, false, now)}
                    past
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <section
        aria-labelledby="club-announcements"
        className="min-w-0"
      >
        <SectionHeader id="club-announcements" icon={Megaphone} title="Announcements" />
        {feedLoading && announcements.length === 0 ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-24 bg-white border border-slate-100 rounded-2xl" />
            <div className="h-24 bg-white border border-slate-100 rounded-2xl" />
          </div>
        ) : announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((a) => (
              <AnnouncementCard
                key={a._id}
                announcement={a}
                variant="detail"
                avatarBg={bgClass}
                isEligible={isAdmin}
                onDelete={handleDeleteAnnouncement}
              />
            ))}
            {feedError && (
              <p className="text-center text-xs text-red-500">
                Couldn't load more announcements.
              </p>
            )}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadMoreLoading}
                className={`flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-400 hover:text-slate-900 transition-colors disabled:opacity-60 ${focusRing}`}
              >
                {loadMoreLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-slate-400" /> Loading…
                  </>
                ) : feedError ? (
                  "Try again"
                ) : (
                  "Load more"
                )}
              </button>
            )}
          </div>
        ) : feedError ? (
          <div className="flex items-center justify-between gap-3 px-4 py-4 bg-white border border-slate-100 rounded-2xl">
            <p className="text-xs text-slate-500">Couldn't load announcements.</p>
            <button
              onClick={() => fetchAnnouncements(0, false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 transition-colors ${focusRing}`}
            >
              Try again
            </button>
          </div>
        ) : (
          <p className="px-4 py-4 text-xs text-slate-500 bg-white border border-slate-100 rounded-2xl">
            No announcements yet.
          </p>
        )}
      </section>
    </div>
  );
};

export default ClubDetail;
