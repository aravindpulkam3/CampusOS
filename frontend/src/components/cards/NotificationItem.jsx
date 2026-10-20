import {
  Bell,
  Briefcase,
  CalendarClock,
  CalendarDays,
  Megaphone,
  MessageSquare,
  School,
  Users,
} from "lucide-react";
import { formatDateTime, formatTimeAgo } from "../../utils/formatDate";

// What a notification is about, from the first part of its `type`
// ("club_event" → club). Classroom deadlines get their own tile.
const CATEGORY = {
  classroom: { label: "Classroom", icon: School },
  deadline: { label: "Deadline", icon: CalendarClock },
  drive: { label: "Placement", icon: Briefcase },
  application: { label: "Placement", icon: Briefcase },
  discussion: { label: "Discussion", icon: MessageSquare },
  club: { label: "Club", icon: Users },
  event: { label: "Event", icon: CalendarDays },
  platform: { label: "Campus", icon: Megaphone },
};
const FALLBACK = { label: "Notification", icon: Bell };

const categoryOf = (type = "") =>
  type === "classroom_deadline" ? CATEGORY.deadline : CATEGORY[type.split("_")[0]] || FALLBACK;

// Category tile, shared by the dropdown rows and the live toasts. The icon
// says what it is about; the red dot, the same as on the bell, says it is
// unread. Decorative: the row's text says both.
export const NotificationTile = ({ type, unread }) => {
  const { icon: Icon } = categoryOf(type);
  return (
    <span
      aria-hidden="true"
      className={`relative grid size-[30px] flex-none place-items-center rounded-[9px] bg-soft ring-1 ring-inset ring-line-2 ${
        unread ? "text-ink" : "text-ink-3"
      }`}
    >
      <Icon size={15} />
      {unread && (
        <span className="absolute -right-[3px] -top-[3px] size-[9px] rounded-full bg-urgent ring-2 ring-white" />
      )}
    </span>
  );
};

const NotificationItem = ({ notification, onRead, onNavigate }) => {
  const { _id, type, title, message, isRead, createdAt } = notification;

  return (
    <button
      type="button"
      onClick={() => {
        if (!isRead) onRead(_id);
        onNavigate(notification);
      }}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-soft focus-visible:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/25"
    >
      <NotificationTile type={type} unread={!isRead} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={`line-clamp-2 min-w-0 flex-1 break-words text-[13.5px] leading-[1.35] ${
              isRead ? "text-ink-2" : "font-semibold text-ink"
            }`}
          >
            <span className="sr-only">
              {categoryOf(type).label}
              {isRead ? ": " : ", unread: "}
            </span>
            {title}
          </span>
          <time
            dateTime={createdAt}
            title={formatDateTime(createdAt)}
            className="flex-none whitespace-nowrap text-[12px] text-ink-3"
          >
            {formatTimeAgo(createdAt)}
          </time>
        </span>
        {message && (
          <span className="mt-0.5 line-clamp-2 block break-words text-[12.5px] leading-[1.4] text-ink-2">
            {message}
          </span>
        )}
      </span>
    </button>
  );
};

export default NotificationItem;
