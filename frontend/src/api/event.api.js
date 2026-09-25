import api from "./axios";

export const createEvent = (data) => api.post("/events/create", data);
export const updateEvent = (eventId, data) =>
  api.put(`events/${eventId}/update`, data);
export const getAllEvents = (filters = {}) => {
  return api.get("events", {
    params: {
      category: filters.category || "All",
      search: filters.search || "",
      offset: filters.offset || 0,
    },
  });
};
export const getEventById = (id) => api.get(`/events/${id}`);
export const registerForEvent = (id) => api.put(`/events/${id}/register`);
export const unregisterFromEvent = (id) => api.delete(`/events/${id}/register`);
export const getUpcomingEvents = () => api.get(`events/upcoming`);
export const getUserRegisteredEvents = () => api.get("events/registered");
