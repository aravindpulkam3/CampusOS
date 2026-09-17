import { useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useNotifications from "../../hooks/useNotifications";
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

  return (
    <div
      role="status"
      onClick={handleClick}
      className="pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-lg transition-shadow hover:shadow-xl"
    >
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
        <Bell size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-snug text-gray-900">
          {notification.title}
        </p>
        {notification.message && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
            {notification.message}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={(event) => {
          event.stopPropagation();
          onDismiss(notification._id);
        }}
        className="-mr-1 -mt-1 rounded-md p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <X size={13} />
      </button>
    </div>
  );
};

const NotificationToasts = () => {
  const { toasts, dismissToast } = useNotifications();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col items-end gap-2">
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
