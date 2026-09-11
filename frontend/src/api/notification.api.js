import api from "./axios";

export const getNotifications = (offset = 0) =>
  api.get("/notifications", { params: { offset } });

export const getUnreadNotificationCount = () =>
  api.get("/notifications/unread-count");

export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  api.patch("/notifications/read-all");
