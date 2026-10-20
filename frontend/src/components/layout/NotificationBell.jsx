import { useState, useEffect, useId, useRef } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useNotifications from "../../hooks/useNotifications";
import NotificationItem from "../cards/NotificationItem";
import { getNotificationPath } from "../../utils/notificationNavigation";
import { LoadError, focusRing, textLink } from "../common/ui";

const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, error, markRead, markAllRead, refetch } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();
  const titleId = useId();

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Escape closes the panel and hands focus back to the bell.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setIsOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const handleNavigate = (notification) => {
    setIsOpen(false);
    navigate(getNotificationPath(notification));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        className={`relative grid size-9 place-items-center rounded-[10px] transition-colors ${focusRing} ${
          isOpen ? "bg-ink/[0.06] text-ink" : "text-ink-2 hover:bg-ink/[0.04] hover:text-ink"
        }`}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-0.5 top-0.5 h-4 min-w-4 rounded-full bg-urgent px-1 text-center text-[10px] font-bold leading-4 tabular-nums text-white ring-2 ring-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          id={panelId}
          aria-labelledby={titleId}
          className="absolute right-0 top-[calc(100%+8px)] z-50 flex max-h-[min(520px,calc(100dvh-5rem))] w-[380px] flex-col overflow-hidden rounded-panel border border-line-2 bg-white shadow-panel max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:w-auto"
        >
          {/* Header */}
          <div className="flex min-h-12 flex-none items-center gap-2 border-b border-line py-2 pl-4 pr-3.5">
            <h2 id={titleId} className="text-[15px] font-[650] tracking-[-0.02em] text-ink">
              Notifications
            </h2>
            {unreadCount > 0 && <span className="text-[13px] text-ink-3">{unreadCount} new</span>}
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className={`ml-auto flex items-center gap-1.5 ${textLink}`}>
                <CheckCheck size={14} aria-hidden="true" /> Mark all as read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div role="status" className="animate-pulse space-y-3.5 p-4">
                <span className="sr-only">Loading notifications</span>
                {[72, 56, 64].map((w) => (
                  <div key={w} className="flex items-center gap-3">
                    <div className="size-[30px] flex-none rounded-[9px] bg-soft" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 rounded bg-soft" style={{ width: `${w}%` }} />
                      <div className="h-2 w-1/2 rounded bg-soft" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="px-4 py-4">
                <LoadError onRetry={refetch}>Couldn't load notifications.</LoadError>
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-5 text-[13.5px] leading-[1.5] text-ink-2">
                <span className="font-semibold text-ink">You're all caught up.</span> New
                notifications will show up here.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n._id}
                    notification={n}
                    onRead={markRead}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default NotificationBell;
