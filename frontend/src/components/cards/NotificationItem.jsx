import { formatRelativeTime } from "../../utils/formatDate";

const NotificationItem = ({ notification, onRead }) => {
  const { _id, title, message, isRead, createdAt } = notification;

  return (
    <button
      onClick={() => !isRead && onRead(_id)}
      className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors duration-100
        ${isRead ? "hover:bg-gray-50/70" : "bg-blue-50/40 hover:bg-blue-50/60"}`}
    >
      <span
        className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRead ? "bg-transparent" : "bg-blue-500"}`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs truncate leading-snug ${isRead ? "font-medium text-gray-600" : "font-semibold text-gray-900"}`}
        >
          {title}
        </p>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">{message}</p>
        <p className="text-[10px] text-gray-300 mt-1">{formatRelativeTime(createdAt)}</p>
      </div>
    </button>
  );
};

export default NotificationItem;
