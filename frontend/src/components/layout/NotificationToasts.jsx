import { useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useNotifications from "../../hooks/useNotifications";
import { NotificationTile } from "../cards/NotificationItem";
import { getNotificationPath } from "../../utils/notificationNavigation";

const AUTO_DISMISS_MS = 4000;

const NotificationToast = ({ notification, onDismiss }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => onDismiss(notification._id),
      AUTO_DISMISS_MS,
    );

    return () => window.clearTimeout(timeoutId);
  }, [notification._id, onDismiss]);

  const handleClick = () => {
    onDismiss(notification._id);
    navigate(getNotificationPath(notification));
  };

  // Same layout as a row in the bell dropdown. Opening it and dismissing it
  // are two sibling buttons, so both are reachable by keyboard.
  return (
    <div
      role="status"
      className="pointer-events-auto flex w-[340px] max-w-full items-start rounded-[14px] border border-line-2 bg-white shadow-panel max-sm:w-full"
    >
      <button
        type="button"
        onClick={handleClick}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-l-[14px] py-3 pl-3 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/25"
      >
        <NotificationTile type={notification.type} unread />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block break-words text-[13.5px] font-semibold leading-[1.35] text-ink">
            {notification.title}
          </span>
          {notification.message && (
            <span className="mt-0.5 line-clamp-2 block break-words text-[12.5px] leading-[1.4] text-ink-2">
              {notification.message}
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(notification._id)}
        className="m-1.5 grid size-7 flex-none place-items-center rounded-lg text-ink-3 transition-colors hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
};

// Bottom-right, clear of the top bar's bell and avatar; full width on phones.
const NotificationToasts = () => {
  const { toasts, dismissToast } = useNotifications();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 max-sm:left-4 max-lg:bottom-20">
      {toasts.map((notification) => (
        <NotificationToast
          key={notification._id}
          notification={notification}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
};

export default NotificationToasts;
