import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  MapPin,
  Calendar,
  Plus,
  Megaphone,
  UserPlus,
  UserMinus,
  ChevronRight,
  Image,
  Edit,
  Shield,
  Info,
  Activity,
  Bell,
  BellOff,
} from "lucide-react";
import { followClub, getClubDetails, toggleMuteClub } from "../../api/club.api";
import useAuth from "../../hooks/useAuth";
import NoticeFeed from "../../components/cards/NoticeFeed";
import AnnouncementCard from "../announcements/AnnouncementCard";
import { deleteAnnouncement } from "../../api/announcement.api";

// ─── Helpers ──────────────────────────────────────────────────
const clubBg = [
  "bg-slate-900",
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-rose-600",
];

const categoryColor = {
  Technical: "bg-blue-50 text-blue-700 border-blue-100",
  Cultural: "bg-purple-50 text-purple-700 border-purple-100",
  Creative: "bg-orange-50 text-orange-700 border-orange-100",
  Business: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const clubInitials = (name) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const eligibilityLabel = (branches, years) => {
  if (!branches?.length && !years?.length) return "Open to All";
  const b = branches?.length ? branches.join(", ") : "All Branches";
  const y = years?.length ? `Year ${years.join(", ")}` : "All Years";
  return `${b} • ${y}`;
};

// ─── Skeleton ─────────────────────────────────────────────────
const Skeleton = () => (
  <div className="max-w-6xl mx-auto px-4 py-4 animate-pulse space-y-6">
    <div className="w-20 h-4 bg-slate-200 rounded" />
    <div className="h-44 bg-slate-200 rounded-2xl" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="h-40 bg-slate-100 rounded-2xl" />
        <div className="h-60 bg-slate-100 rounded-2xl" />
      </div>
      <div className="space-y-4">
        <div className="h-32 bg-slate-100 rounded-2xl" />
        <div className="h-44 bg-slate-100 rounded-2xl" />
      </div>
    </div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl shadow-3xs px-4">
    <Megaphone size={20} className="mx-auto text-slate-300 mb-2.5" />
    <p className="text-xs font-medium text-slate-400">{message}</p>
  </div>
);

const AdminBtn = ({ to, icon: Icon, label }) => (
  <Link
    to={to}
    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200/80 text-slate-600 rounded-xl hover:border-slate-400 hover:text-slate-900 transition-all bg-white/90 backdrop-blur-xs shadow-3xs"
  >
    <Icon size={12} className="text-slate-400" />
    {label}
  </Link>
);

const SectionHeader = ({ title, icon: Icon, count, action }) => (
  <div className="flex items-center justify-between mb-4 mt-2 px-1">
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-slate-400" />
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {title}
      </h2>
      {count > 0 && (
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
    {action}
  </div>
);

// ─── Event Card ───────────────────────────────────────────────
const EventCard = ({ event, past = false }) => (
  <Link
    to={`/community/events/${event._id}`}
    className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white border rounded-2xl hover:border-slate-300 hover:shadow-xs transition-all duration-200 group relative overflow-hidden
      ${past ? "border-slate-100 opacity-60 bg-slate-50/40" : "border-slate-100/90 shadow-3xs"}`}
  >
    <div className="w-full sm:w-20 h-24 sm:h-14 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0 relative">
      {event.bannerUrl || event.image || event.banner ? (
        <img
          src={event.bannerUrl || event.image || event.banner}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
          <Calendar size={15} />
        </div>
      )}
    </div>

    <div className="flex items-center gap-3 flex-shrink-0 sm:border-r sm:border-slate-100 sm:pr-4 min-w-[55px]">
      <div className="text-center sm:w-full">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          {new Date(event.startDateTime).toLocaleDateString("en-IN", {
            month: "short",
          })}
        </div>
        <div className="text-2xl font-black text-slate-800 leading-none mt-0.5">
          {new Date(event.startDateTime).getDate()}
        </div>
      </div>
    </div>

    <div className="flex-1 min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 leading-snug truncate transition-colors">
          {event.eventName}
        </h4>
        {event.category && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryColor[event.category] || "bg-slate-50 text-slate-600"}`}
          >
            {event.category}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-medium">
        <span className="flex items-center gap-1 truncate">
          <MapPin size={11} className="text-slate-300" /> {event.venue}
        </span>
        <span className="flex items-center gap-1 truncate">
          <Users size={11} className="text-slate-300" />{" "}
          {eligibilityLabel(event.eligibleBranches, event.eligibleYears)}
        </span>
      </div>
    </div>

    <ChevronRight
      size={14}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hidden sm:block transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
    />
  </Link>
);

// ─── Main View Component ──────────────────────────────────────
const ClubDetail = () => {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchClub = async () => {
      try {
        const payload = await getClubDetails(clubId);
        const {
          club: fetchedClub,
          events: fetchedEvents,
          announcements: fetchedAnnouncements,
          isAdmin: adminStatus,
        } = payload.data.data;

        setClub(fetchedClub);
        setEvents(fetchedEvents || []);
        setAnnouncements(fetchedAnnouncements || []);
        setIsAdmin(adminStatus);

        if (user) {
          setIsFollowing(
            user.followedClubs?.some(
              (id) => id.toString() === clubId.toString(),
            ),
          );
          setJoined(
            fetchedClub.clubAdmins?.some(
              (m) => m.toString() === user._id.toString(),
            ),
          );
          setIsMuted(
            user.mutedClubs?.some((c) => c.toString() === clubId.toString()),
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClub();
  }, [clubId, user]);

  const handleFollowButton = async () => {
    try {
      const payload = await followClub(clubId);
      setClub(payload.data.data.club);
      setUser(payload.data.data.user);
      setIsFollowing(payload.data.data.isFollowing);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMuteButton = async () => {
    try {
      const payload = await toggleMuteClub(clubId);
      const nowMuted = payload.data.data.isMuted;
      setIsMuted(nowMuted);
      setUser((prev) => ({
        ...prev,
        mutedClubs: nowMuted
          ? [...(prev.mutedClubs || []), clubId]
          : (prev.mutedClubs || []).filter((id) => id.toString() !== clubId),
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    } catch (error) {
      console.error(error);
    }
  };


  if (loading) return <Skeleton />;
  if (!club)
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-xs text-slate-400 font-medium">
          Club asset node missing.
        </p>
      </div>
    );

  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.endDateTime) >= now);
  const pastEvents = events.filter((e) => new Date(e.endDateTime) < now);
  const bgClass = clubBg[club.clubName?.charCodeAt(0) % clubBg.length];
  const initials = clubInitials(club.clubName);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 space-y-5">
      {/* Navigation Row */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft size={13} /> Return to Hub
      </button>

      {/* ── Club Billboard Header ── */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-3xs">
        <div className="h-36 sm:h-44 bg-slate-50 relative overflow-hidden border-b border-slate-100">
          {club.banner ? (
            <img
              src={club.banner}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center opacity-90">
              <Activity size={24} className="text-white/10" />
            </div>
          )}

          {isAdmin && (
            <div className="absolute top-3 right-3 flex flex-wrap items-center gap-2 max-w-[90%] justify-end">
              <AdminBtn
                to={`/clubs/${clubId}/create-notice`}
                icon={Plus}
                label="Notice"
              />
              <AdminBtn
                to={`/community/club/${clubId}/announcements/create`}
                icon={Plus}
                label="Announcement"
              />
              <button
                onClick={() =>
                  navigate(`/community/clubs/${clubId}/edit`, {
                    state: { club, isAdmin },
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200/80 text-slate-600 rounded-xl hover:border-slate-400 hover:text-slate-900 bg-white/90 backdrop-blur-xs transition shadow-3xs"
              >
                <Edit size={12} /> Customize Hub
              </button>
            </div>
          )}
        </div>

        {/* Profile Details Bar */}
        <div className="px-5 pb-5 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 sm:-mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3.5">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white ${bgClass} flex items-center justify-center text-white text-2xl font-black shadow-xs overflow-hidden flex-shrink-0 z-10`}
            >
              {club.logo ? (
                <img
                  src={club.logo}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="space-y-1 sm:mb-1">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight leading-tight">
                {club.clubName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium text-[11px] text-slate-400">
                {club.category && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryColor[club.category] || "bg-slate-50 text-slate-500"}`}
                  >
                    {club.category}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={11} className="text-slate-300" />{" "}
                  {club.followerCount ?? 0} followers
                </span>
                <span className="flex items-center gap-1">
                  <Shield size={11} className="text-slate-300" />{" "}
                  {club.clubAdmins?.length ?? 0} operators
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-end z-10">
            <button
              onClick={handleFollowButton}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all duration-150 shadow-3xs
                ${
                  isFollowing
                    ? "border-slate-200 text-slate-400 bg-slate-50 hover:border-red-200 hover:text-red-500 hover:bg-red-50/30"
                    : "border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900"
                }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
            {isFollowing && (
              <button
                onClick={handleMuteButton}
                title={isMuted ? "Unmute notifications" : "Mute notifications"}
                className={`p-1.5 rounded-xl border transition-all duration-150 shadow-3xs
                  ${
                    isMuted
                      ? "border-slate-200 text-slate-300 bg-slate-50 hover:border-slate-400 hover:text-slate-600"
                      : "border-slate-200 text-slate-500 bg-white hover:border-slate-400 hover:text-slate-900"
                  }`}
              >
                {isMuted ? <BellOff size={14} /> : <Bell size={14} />}
              </button>
            )}
            <button
              onClick={() => setJoined((p) => !p)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all duration-150 shadow-3xs
                ${
                  joined
                    ? "bg-slate-50 border-slate-200 text-slate-400 hover:bg-red-50/30 hover:text-red-500 hover:border-red-200"
                    : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                }`}
            >
              {joined ? (
                <>
                  <UserMinus size={12} /> Leave Core
                </>
              ) : (
                <>
                  <UserPlus size={12} /> Join Core
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Primary Responsive Split Viewport Layout Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* LEFT COLUMN: Strategic Timeline Feeds */}
        <div className="lg:col-span-2 space-y-5 order-2 lg:order-1">
          {/* Announcements Section */}
          <section>
            <SectionHeader
              title="Announcements"
              icon={Megaphone}
              count={announcements.length}
            />
            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <AnnouncementCard
                    key={a._id}
                    announcement={a}
                    variant="detail"
                    avatarBg={bgClass}
                    onDelete={handleDeleteAnnouncement}
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No broadcast log files populated yet." />
            )}
          </section>

          {/* Upcoming Events Section */}
          
          <section>
            <div className="flex items-center justify-between mb-4">
              <SectionHeader
                title="Active Calendars"
                icon={Calendar}
                count={upcomingEvents.length}
              />
              <button
                onClick={()=>{ navigate(`/community/clubs/${clubId}/events/create`) }} 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />{" "}
                {/* Optional icon using Lucide Icons */}
                Create Event
              </button>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            ) : (
              <EmptyState message="No live entries mapped on active timelines." />
            )}
          </section>

          {/* Historical Logs Section */}
          {pastEvents.length > 0 && (
            <section>
              <SectionHeader
                title="Historical Context"
                icon={Calendar}
                count={pastEvents.length}
              />
              <div className="space-y-3">
                {pastEvents.map((event) => (
                  <EventCard key={event._id} event={event} past />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN: Static Information Sidebar Nodes */}
        <div className="space-y-5 order-1 lg:order-2 lg:sticky lg:top-4">
          {/* Description Block */}
          {club.description && (
            <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-3xs space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Info size={13} /> Portfolio Meta
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium whitespace-pre-line">
                {club.description}
              </p>
            </div>
          )}

          {/* Notice Boards Feed Widget Integration */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-3xs">
            <NoticeFeed
              targetType="clubs"
              targetId={clubId}
              title="Club Noticeboard"
              canPost={user?.role === "superadmin"}
              showActions={user?.role === "superadmin"}
              compact={true}
            />
          </div>

          {/* Team Leadership Section */}
          {club.clubAdmins?.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-3xs space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Operational Registry Leads
              </div>
              <div className="grid grid-cols-1 gap-2">
                {club.clubAdmins.map((admin, i) => (
                  <div
                    key={admin._id || i}
                    className="flex items-center gap-2.5 p-2 bg-slate-50/50 border border-slate-100/60 rounded-xl"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg ${clubBg[i % clubBg.length]} flex items-center justify-center text-white text-[10px] font-bold border border-black/5`}
                    >
                      {admin.firstName?.[0]}
                      {admin.lastName?.[0]}
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {admin.firstName} {admin.lastName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClubDetail;
