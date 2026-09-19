import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { contentLimiter } from "../middleware/rateLimitMiddleware.js";
import {
  getDiscussions,
  getDiscussionById,
  createDiscussion,
  deleteDiscussion,
  upvoteDiscussion,
  removeDiscussionUpvote,
  bookmarkDiscussion,
  removeBookmark,
  addComment,
  upvoteComment,
  removeCommentUpvote,
  acceptAnswer,
  deleteComment,
  addReply,
  upvoteReply,
  removeReplyUpvote,
  deleteReply,
} from "../controllers/discussion.controller.js";

const discussionRouter = express.Router();

// ── Discussions ──────────────────────────────────────────────
// Authenticated: discussions expose students' names, branch and year.
discussionRouter.get("/", authMiddleware, getDiscussions);
discussionRouter.get("/:id", authMiddleware, getDiscussionById);
discussionRouter.post("/", authMiddleware, contentLimiter, createDiscussion);
discussionRouter.delete("/:id", authMiddleware, deleteDiscussion);
// Upvotes/bookmarks: PUT sets, DELETE clears — idempotent, never a toggle.
discussionRouter.put("/:id/upvote", authMiddleware, upvoteDiscussion);
discussionRouter.delete("/:id/upvote", authMiddleware, removeDiscussionUpvote);
discussionRouter.put("/:id/bookmark", authMiddleware, bookmarkDiscussion);
discussionRouter.delete("/:id/bookmark", authMiddleware, removeBookmark);

// ── Comments ─────────────────────────────────────────────────
discussionRouter.post("/:id/comments", authMiddleware, contentLimiter, addComment);
discussionRouter.put(
  "/:id/comments/:commentId/upvote",
  authMiddleware,
  upvoteComment,
);
discussionRouter.delete(
  "/:id/comments/:commentId/upvote",
  authMiddleware,
  removeCommentUpvote,
);
discussionRouter.post(
  "/:id/comments/:commentId/accept",
  authMiddleware,
  acceptAnswer,
);
discussionRouter.delete(
  "/:id/comments/:commentId",
  authMiddleware,
  deleteComment,
);

// ── Replies ──────────────────────────────────────────────────
discussionRouter.post(
  "/:id/comments/:commentId/replies",
  authMiddleware,
  contentLimiter,
  addReply,
);
discussionRouter.put(
  "/:id/comments/:commentId/replies/:replyId/upvote",
  authMiddleware,
  upvoteReply,
);
discussionRouter.delete(
  "/:id/comments/:commentId/replies/:replyId/upvote",
  authMiddleware,
  removeReplyUpvote,
);
discussionRouter.delete(
  "/:id/comments/:commentId/replies/:replyId",
  authMiddleware,
  deleteReply,
);

export default discussionRouter;
