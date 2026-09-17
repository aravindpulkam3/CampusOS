import { useState, useEffect, useRef } from "react";
import { Bell, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useNotifications from "../../hooks/useNotifications";
import NotificationItem from "../cards/NotificationItem";
import { getNotificationPath } from "../../utils/notificationNavigation";

const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, error, markRead, markAllRead } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNavigate = (notification) => {
    setIsOpen(false);
    navigate(getNotificationPath(notification));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50 flex flex-col max-h-[520px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {[72, 56, 64].map((w, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-1.5 h-1.5 bg-gray-100 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 bg-gray-100 rounded" style={{ width: `${w}%` }} />
                      <div className="h-2 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="text-xs text-red-400 px-4 py-6 text-center">{error}</p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Bell size={16} className="text-gray-300" />
                </div>
                <p className="text-xs font-medium text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n._id}
                  notification={n}
                  onRead={markRead}
                  onNavigate={handleNavigate}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
