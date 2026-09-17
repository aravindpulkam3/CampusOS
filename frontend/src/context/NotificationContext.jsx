import { createContext, useState, useEffect, useCallback, useRef } from "react";
import useAuth from "../hooks/useAuth.js";
import useSocket from "../hooks/useSocket.js";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/notification.api.js";

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const socket = useSocket(!!user);

  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const seenNotificationIds = useRef(new Set());

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listRes, countRes] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ]);
      const fetchedNotifications = listRes.data.data.notifications;
      fetchedNotifications.forEach((notification) =>
        seenNotificationIds.current.add(notification._id),
      );
      setNotifications((current) => {
        const fetchedIds = new Set(
          fetchedNotifications.map((notification) => notification._id),
        );
        const receivedDuringFetch = current.filter(
          (notification) => !fetchedIds.has(notification._id),
        );
        return [...receivedDuringFetch, ...fetchedNotifications];
      });
      setUnreadCount(countRes.data.data.count);
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setToasts([]);
      setUnreadCount(0);
      setError("");
      setLoading(false);
      seenNotificationIds.current.clear();
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const handleNew = (notification) => {
      if (
        !notification?._id ||
        seenNotificationIds.current.has(notification._id)
      ) {
        return;
      }

      seenNotificationIds.current.add(notification._id);
      setNotifications((prev) => [notification, ...prev]);
      if (!notification.isRead) setUnreadCount((prev) => prev + 1);
      setToasts((prev) => [...prev, notification].slice(-3));
    };

    socket.on("notification:new", handleNew);
    return () => socket.off("notification:new", handleNew);
  }, [socket]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((notification) => notification._id !== id));
  }, []);

  const markRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch {
      fetchNotifications();
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      fetchNotifications();
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        toasts,
        unreadCount,
        loading,
        error,
        markRead,
        markAllRead,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
