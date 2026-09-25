import api from "./axios.js";

export const getDiscussions = (params) => api.get("/discussions", { params });
export const getDiscussionById = (id) => api.get(`/discussions/${id}`);
export const createDiscussion = (data) => api.post("/discussions", data);
export const deleteDiscussion = (id) => api.delete(`/discussions/${id}`);
// Upvotes/bookmarks are desired-state (idempotent): PUT sets, DELETE clears.
export const upvoteDiscussion = (id) => api.put(`/discussions/${id}/upvote`);
export const unupvoteDiscussion = (id) => api.delete(`/discussions/${id}/upvote`);
export const bookmarkDiscussion = (id) =>
  api.put(`/discussions/${id}/bookmark`);
export const unbookmarkDiscussion = (id) =>
  api.delete(`/discussions/${id}/bookmark`);

// Cursor-paged, oldest first: pass { cursor } from the previous page's nextCursor.
export const getComments = (id, params) =>
  api.get(`/discussions/${id}/comments`, { params });
export const getReplies = (id, cid, params) =>
  api.get(`/discussions/${id}/comments/${cid}/replies`, { params });

export const addComment = (id, data) =>
  api.post(`/discussions/${id}/comments`, data);
export const upvoteComment = (id, cid) =>
  api.put(`/discussions/${id}/comments/${cid}/upvote`);
export const unupvoteComment = (id, cid) =>
  api.delete(`/discussions/${id}/comments/${cid}/upvote`);
export const acceptAnswer = (id, cid) =>
  api.post(`/discussions/${id}/comments/${cid}/accept`);
export const deleteComment = (id, cid) =>
  api.delete(`/discussions/${id}/comments/${cid}`);

export const addReply = (id, cid, data) =>
  api.post(`/discussions/${id}/comments/${cid}/replies`, data);
export const upvoteReply = (id, cid, rid) =>
  api.put(`/discussions/${id}/comments/${cid}/replies/${rid}/upvote`);
export const unupvoteReply = (id, cid, rid) =>
  api.delete(`/discussions/${id}/comments/${cid}/replies/${rid}/upvote`);
export const deleteReply = (id, cid, rid) =>
  api.delete(`/discussions/${id}/comments/${cid}/replies/${rid}`);
