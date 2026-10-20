import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useIsClamped from "../../hooks/useIsClamped";
import useImageOk from "../../hooks/useImageOk";
import { LogoTile, feedTitle, focusRing } from "../../components/common/ui";
import { formatDateTime, formatTimeAgo } from "../../utils/formatDate";

const hoverLine = "decoration-ink/25 underline-offset-[3px] hover:underline";

// One announcement, as a list item (wrap a run of them in <ul>).
//   variant="feed"    the community feed: leads with the club or event it came
//                     from, and links there
//   variant="detail"  on that club's or event's own page: leads with who posted it
// `isEligible` allows deleting (superadmins always may).
const AnnouncementCard = ({ announcement, variant = "detail", onDelete, isEligible }) => {
  const isFeed = variant === "feed";
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const bodyRef = useRef(null);
  const isClamped = useIsClamped(bodyRef, !isExpanded, announcement.body);
  const [showImage, onImageError] = useImageOk(announcement.image);

  // ── Where it came from (feed) ──
  const fromEvent = announcement.targetType === "event";
  const sourceName = fromEvent ? announcement.event?.eventName : announcement.club?.clubName;
  const sourceId = fromEvent ? announcement.event?._id : announcement.club?._id;
  const sourceTo = sourceId && `/community/${fromEvent ? "events" : "clubs"}/${sourceId}`;

  // ── Who posted it (detail) ──
  const author = announcement.postedBy;
  const isPopulated = author && typeof author === "object" && "firstName" in author;
  const authorName = isPopulated
    ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim()
    : "System Admin";

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      setIsDeleting(true);
      if (onDelete) await onDelete(announcement._id);
    } catch (error) {
      console.error("Failed to delete announcement:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const when = (
    <time dateTime={announcement.createdAt} title={formatDateTime(announcement.createdAt)}>
      {formatTimeAgo(announcement.createdAt)}
    </time>
  );

  return (
    <li className={`flex items-start gap-3.5 py-5 first:pt-1.5 ${isDeleting ? "pointer-events-none opacity-50" : ""}`}>
      {isFeed ? (
        <LogoTile src={announcement.club?.logo} name={sourceName} />
      ) : (
        <LogoTile src={isPopulated ? author.profilePicture : null} name={authorName} cover />
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2 text-[13.5px]">
          <span className="min-w-0 truncate font-[550] text-ink">
            {isFeed && sourceTo ? (
              <Link to={sourceTo} className={`rounded ${hoverLine} ${focusRing}`}>
                {sourceName}
              </Link>
            ) : isFeed ? (
              sourceName
            ) : (
              authorName
            )}
          </span>
          <span className="flex-none text-ink-3">
            {isFeed && (fromEvent ? "Event update, " : "Club announcement, ")}
            {when}
          </span>
        </p>

        <h3 className={`mt-1 ${feedTitle}`}>
          {isFeed && sourceTo ? (
            <Link to={sourceTo} className={`rounded ${hoverLine} ${focusRing}`}>
              {announcement.title}
            </Link>
          ) : (
            announcement.title
          )}
        </h3>

        {/* Clamped to 3 lines of running text; the toggle appears only when text is cut off */}
        {announcement.body && (
          <p
            ref={bodyRef}
            className={`mt-1 break-words text-[14.5px] leading-normal text-ink-2 ${
              isExpanded ? "whitespace-pre-line" : "line-clamp-3"
            }`}
          >
            {announcement.body}
          </p>
        )}
        {(isClamped || isExpanded) && (
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            aria-expanded={isExpanded}
            className={`mt-1.5 rounded text-[13px] font-[550] text-ink-2 transition-colors hover:text-ink ${focusRing}`}
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}

        {showImage && (
          <img
            src={announcement.image}
            alt=""
            loading="lazy"
            onError={onImageError}
            className="mt-3.5 aspect-video w-full max-w-[460px] rounded-2xl bg-soft object-cover"
          />
        )}
      </div>

      {(isEligible || user?.role === "superadmin") && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete announcement"
          className={`-mr-1.5 -mt-1 grid size-8 flex-none place-items-center rounded-lg text-ink-3 transition-colors hover:bg-soft hover:text-urgent ${focusRing}`}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      )}
    </li>
  );
};

export default AnnouncementCard;
