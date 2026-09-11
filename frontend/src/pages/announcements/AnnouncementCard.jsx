import { Megaphone, Radio, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import useAuth from "../../hooks/useAuth";

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
  return `${days}d ago`;
};

const clubBg = [
  "bg-slate-900",
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-rose-600",
];

const getAccentBg = (name) =>
  clubBg[(name?.charCodeAt(0) ?? 0) % clubBg.length];

const getInitials = (name) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

const typeConfig = {
  club: {
    label: "Club Announcement",
    icon: Megaphone,
    color: "bg-blue-50 text-blue-700 border-blue-100/40",
  },
  event: {
    label: "Event Update",
    icon: Radio,
    color: "bg-purple-50 text-purple-700 border-purple-100/40",
  },
};

const AnnouncementCard = ({
  announcement,
  variant = "detail",
  avatarBg,
  onClick,
  onDelete,
  isEligible,
}) => {
  const isFeed = variant === "feed";
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // ✅ Added expand state tracker
  const { user } = useAuth();

  // ── Source info (feed variant) ──────────────────────────────
  const tType = announcement.targetType;
  const tConf = typeConfig[tType] || typeConfig.club;
  const TypeIcon = tConf.icon;

  const sourceName =
    tType === "club"
      ? announcement.club?.clubName
      : announcement.event?.eventName;
  const sourceAvatarBg = avatarBg || getAccentBg(sourceName);
  const sourceInitials = getInitials(sourceName);

  // ── Author info (detail variant) ────────────────────────────
  const author = announcement.postedBy;
  const isPopulated =
    author && typeof author === "object" && "firstName" in author;

  const authorName = isPopulated
    ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim()
    : "System Admin";
  const authorInitials = isPopulated
    ? `${author.firstName?.[0] ?? ""}${author.lastName?.[0] ?? ""}`.toUpperCase()
    : "A";
  const authorAvatarBg = avatarBg || "bg-slate-800";

  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        setIsDeleting(true);
        if (onDelete) await onDelete(announcement._id);
      } catch (error) {
        console.error("Failed to delete announcement:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const toggleExpand = (e) => {
    e.stopPropagation(); // Stop click pass-throughs from altering standard navigation
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      onClick={isFeed && onClick ? onClick : undefined}
      className={`bg-white border border-slate-100 rounded-2xl overflow-hidden transition-all duration-200 shadow-3xs
        ${isFeed && onClick ? "cursor-pointer hover:border-slate-300 hover:shadow-2xs group" : ""}
        ${isDeleting ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      {/* Feed Card Top Hero Image */}
      {isFeed && announcement.image && (
        <div className="w-full h-44 sm:h-48 overflow-hidden bg-slate-50 border-b border-slate-100">
          <img
            src={announcement.image}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Feed layout Header */}
        {isFeed && (
          <div className="flex items-center justify-between gap-2">
            <span
              className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-md border tracking-wide uppercase ${tConf.color}`}
            >
              <TypeIcon size={11} />
              {tConf.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">
                {relativeTime(announcement.createdAt)}
              </span>
              {(isEligible || user?.role === "superadmin") && (
                <button
                  onClick={handleDeleteClick}
                  className="text-slate-400 hover:text-red-500 p-1 rounded-xl hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Detailed Layout View Header */}
        {!isFeed && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {/* Profile Image fallback layer */}
              <div
                className={`w-8 h-8 rounded-xl ${authorAvatarBg} flex items-center justify-center text-white text-xs font-black flex-shrink-0 overflow-hidden border border-black/5`}
              >
                {isPopulated && author.profilePicture ? (
                  <img
                    src={author.profilePicture}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  authorInitials
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {authorName}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-px">
                  {relativeTime(announcement.createdAt)}
                </p>
              </div>
            </div>
            {(isEligible || user?.role === "superadmin") && (
              <button
                onClick={handleDeleteClick}
                className="text-slate-400 hover:text-red-500 p-1 rounded-xl hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}

        {/* Core content header title string block */}
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug tracking-tight">
            {announcement.title}
          </h4>

          {/* Announcement Body Content Frame with Show More Toggle Controls */}
          {announcement.body && (
            <div className="relative">
              <p
                className={`text-xs text-slate-500 font-medium leading-relaxed whitespace-pre-line
        ${!isExpanded ? "line-clamp-3" : ""}`}
                ref={(el) => {
                  if (el && !isExpanded) {
                    const hasOverflow = el.scrollHeight > el.clientHeight;
                    if (hasOverflow && !el.dataset.hasTrigger) {
                      el.dataset.hasTrigger = "true";
                      // Forces a localized update to show the button only when text is actively clipped
                      el.nextSibling &&
                        el.nextSibling.classList.remove("hidden");
                    }
                  }
                }}
              >
                {announcement.body}
              </p>

              
              <button
                onClick={toggleExpand}
                className="hidden flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 mt-1.5 transition-colors"
              >
                {isExpanded ? (
                  <>
                    Show less <ChevronUp size={12} />
                  </>
                ) : (
                  <>
                    Show more <ChevronDown size={12} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Inline Content Attachment Image (Detail variant layout placement) */}
        {!isFeed && announcement.image && (
          <div className="w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50/50 shadow-3xs">
            <img
              src={announcement.image}
              alt=""
              className="w-full h-auto max-h-[400px] object-contain mx-auto"
              loading="lazy"
            />
          </div>
        )}

        {/* Feed Source Chip Summary Footer Block */}
        {isFeed && sourceName && (
          <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
            <div
              className={`w-5 h-5 rounded-md ${sourceAvatarBg} flex items-center justify-center text-white font-black flex-shrink-0 border border-black/5`}
              style={{ fontSize: "8px" }}
            >
              {sourceInitials}
            </div>
            <span className="text-[11px] font-semibold text-slate-400 truncate">
              {sourceName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementCard;
