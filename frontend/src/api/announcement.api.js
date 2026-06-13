import api from "./axios";
// TODO: define announcement API calls
export const createAnnouncement = (targetType, targetId, data) =>
  api.post(`/announcements/${targetType}/${targetId}`, data);
export const getAnnouncements=(targetType,targetId)=>api.get(`/announcements/${targetType}/${targetId}`);
export const getCommunityFeed=()=>api.get(`announcements/community`);
export const getUserActivity = () => api.get('/announcements/user-activity');
