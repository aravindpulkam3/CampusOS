import api from "./axios.js";

export const getAllClubs=()=>api.get("/clubs");
export const createClub=(data)=>api.post("/clubs",data);
export const getClubDetails=(clubId)=>api.get(`/clubs/${clubId}`);
// Desired-state (idempotent): PUT sets, DELETE clears. The UI picks the call
// from its current state; there is no server-side toggle.
export const followClub=(clubId)=>api.put(`/clubs/${clubId}/follow`);
export const unfollowClub=(clubId)=>api.delete(`/clubs/${clubId}/follow`);
export const muteClub=(clubId)=>api.put(`/clubs/${clubId}/mute`);
export const unmuteClub=(clubId)=>api.delete(`/clubs/${clubId}/mute`);
export const getPopularClubs=()=>api.get("/clubs/popular");
export const getUserFollowedClubs = () => api.get('/clubs/followed');
export const updateClub=(clubId,data)=> api.put(`clubs/${clubId}/update`,data);