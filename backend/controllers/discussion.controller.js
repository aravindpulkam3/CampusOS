import Discussion from "../models/Discussion.js";
import Comment from "../models/Comment.js";
import Reply from "../models/Reply.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import { createNotification } from "../services/notification.service.js";

// Who upvoted or bookmarked what is not public: responses carry counts plus the
// VIEWER's own state, never the underlying arrays of user ids.
const shapeVotes = (doc, userId) => {
  const { upvotes = [], bookmarks, ...rest } = doc;
  const uid = String(userId);
  const shaped = {
    ...rest,
    upvoteCount: upvotes.length,
    upvoted: upvotes.some((u) => String(u) === uid),
  };
  if (bookmarks !== undefined) shaped.bookmarked = bookmarks.some((u) => String(u) === uid);
  return shaped;
};

// Express 4's query parser turns `?x[$ne]=1` into an object; filters only
// accept plain strings.
const queryString = (value) => (typeof value === "string" ? value : undefined);

// Mirrors the schema maxlengths; checked up front for a clear 400.
const MAX_DISCUSSION_LENGTH = 10000;
const MAX_COMMENT_LENGTH = 5000; // comments and replies
const tooLong = (res, max) =>
  res.status(400).json({ success: false, message: `Content must be at most ${max} characters.` });

// Upvotes and bookmarks are SET, never toggled: PUT adds the viewer, DELETE
// removes them. $addToSet/$pull on one document are atomic and idempotent, so
// repeated or parallel requests converge on the requested state — server-side
// toggles could not (two concurrent toggles double up or cancel out).
// Returns the updated document's array (or null if `filter` matched nothing).
const setMembership = (Model, filter, field, userId, member) =>
  Model.findOneAndUpdate(
    filter,
    member ? { $addToSet: { [field]: userId } } : { $pull: { [field]: userId } },
    { new: true, projection: { [field]: 1 } },
  ).lean();

// Builds a PUT (member = true) or DELETE (member = false) upvote handler.
// `filterFor(req)` scopes the target to its parents in the URL.
const upvoteHandler = (Model, filterFor, member) =>
  asyncHandler(async (req, res) => {
    const doc = await setMembership(Model, filterFor(req), "upvotes", req.user._id, member);
    if (!doc) return res.status(404).json({ success: false, message: "Not found." });
    const { upvoteCount, upvoted } = shapeVotes(doc, req.user._id);
    sendResponse(res, 200, member ? "Upvoted." : "Upvote removed.", { upvoteCount, upvoted });
  });

const bookmarkHandler = (member) =>
  asyncHandler(async (req, res) => {
    const doc = await setMembership(Discussion, { _id: req.params.id }, "bookmarks", req.user._id, member);
    if (!doc) return res.status(404).json({ success: false, message: "Not found." });
    sendResponse(res, 200, member ? "Bookmarked." : "Bookmark removed.", {
      bookmarked: doc.bookmarks.some((u) => String(u) === String(req.user._id)),
    });
  });

const discussionFilter = (req) => ({ _id: req.params.id });
const commentFilter = (req) => ({
  _id: req.params.commentId,
  discussion: req.params.id,
  isDeleted: false,
});
const replyFilter = (req) => ({
  _id: req.params.replyId,
  comment: req.params.commentId,
  isDeleted: false,
});

// ─────────────────────────────────────────────
// DISCUSSIONS
// ─────────────────────────────────────────────

// GET /api/discussions?category=&search=&sort=newest|popular|unanswered|active&page=1&limit=20
export const getDiscussions = asyncHandler(async (req, res) => {
  const category = queryString(req.query.category);
  const search = queryString(req.query.search);
  const sort = queryString(req.query.sort) ?? "newest";
  // Malformed paging falls back to defaults instead of reaching Mongo as NaN
  // (a 500); limit is capped so one request can't pull the whole collection.
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));

  const query = { isDeleted: false };
  if (category && category !== "all") query.category = category;
  if (typeof search === "string" && search) query.$text = { $search: search };

  const sortMap = {
    newest:     { isPinned: -1, createdAt: -1 },
    popular:    { isPinned: -1, "upvotes.length": -1, views: -1 },
    unanswered: { isPinned: -1, commentCount: 1, createdAt: -1 },
    active:     { isPinned: -1, lastActivityAt: -1 },
  };

  const skip = (page - 1) * limit;

  const [discussions, total] = await Promise.all([
    Discussion.find(query)
      .populate("author", "firstName lastName branch year")
      .sort(Object.hasOwn(sortMap, sort) ? sortMap[sort] : sortMap.newest)
      .skip(skip)
      .limit(limit)
      .lean(),
    Discussion.countDocuments(query),
  ]);

  sendResponse(res, 200, "Discussions fetched.", {
    discussions: discussions.map((d) => shapeVotes(d, req.user._id)),
    pagination: { total, page, pages: Math.ceil(total / limit) },
  });
});

// GET /api/discussions/:id
export const getDiscussionById = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { $inc: { views: 1 } },
    { new: true }
  ).populate("author", "firstName lastName branch year role");

  if (!discussion) {
    return res.status(404).json({ success: false, message: "Discussion not found." });
  }

  // Fetch comments (not deleted), accepted answer floats to top
  const comments = await Comment.find({ discussion: req.params.id, isDeleted: false })
    .populate("author", "firstName lastName branch year role")
    .sort({ isAcceptedAnswer: -1, createdAt: 1 })
    .lean();

  // Fetch ALL replies for these comments in one query (flat, includes nested)
  const commentIds = comments.map((c) => c._id);
  const allReplies = await Reply.find({ comment: { $in: commentIds }, isDeleted: false })
    .populate("author", "firstName lastName branch year role")
    .populate("replyingTo", "firstName lastName")
    .sort({ createdAt: 1 })
    .lean();

  // Build nested reply tree per comment
  // Direct replies (parentReply: null) = roots
  // Nested replies (parentReply set)   = children of their parent
  const buildReplyTree = (commentId) => {
    const flat = allReplies.filter(
      (r) => r.comment.toString() === commentId.toString()
    );
    const map = {};
    flat.forEach((r) => { map[r._id.toString()] = { ...shapeVotes(r, req.user._id), children: [] }; });

    const roots = [];
    flat.forEach((r) => {
      if (r.parentReply) {
        const parent = map[r.parentReply.toString()];
        // If parent exists attach as child; otherwise promote to root
        if (parent) parent.children.push(map[r._id.toString()]);
        else roots.push(map[r._id.toString()]);
      } else {
        roots.push(map[r._id.toString()]);
      }
    });
    return roots;
  };

  const commentsWithReplies = comments.map((c) => ({
    ...shapeVotes(c, req.user._id),
    replies: buildReplyTree(c._id),
  }));

  sendResponse(res, 200, "Discussion fetched.", {
    discussion: shapeVotes(discussion.toObject(), req.user._id),
    comments: commentsWithReplies,
  });
});

// POST /api/discussions
export const createDiscussion = asyncHandler(async (req, res) => {
  const { title, content, category, tags } = req.body ?? {};

  if (
    typeof title !== "string" || !title.trim() ||
    typeof content !== "string" || !content.trim() ||
    typeof category !== "string" || !category
  ) {
    return res.status(400).json({ success: false, message: "Title, content, and category are required." });
  }
  if (content.trim().length > MAX_DISCUSSION_LENGTH) return tooLong(res, MAX_DISCUSSION_LENGTH);
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((t) => typeof t !== "string"))) {
    return res.status(400).json({ success: false, message: "Tags must be a list of strings." });
  }

  const discussion = await Discussion.create({
    title: title.trim(),
    content: content.trim(),
    category,
    tags: tags?.map((t) => t.toLowerCase().trim()).filter(Boolean) || [],
    author: req.user._id,
  });

  await discussion.populate("author", "firstName lastName branch year");
  sendResponse(res, 201, "Discussion created.", shapeVotes(discussion.toObject(), req.user._id));
});

// DELETE /api/discussions/:id  (soft delete — author or superadmin)
export const deleteDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.id);
  if (!discussion) return res.status(404).json({ success: false, message: "Not found." });

  const isOwner = discussion.author.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "superadmin") {
    return res.status(403).json({ success: false, message: "Not authorised." });
  }

  discussion.isDeleted = true;
  await discussion.save();
  sendResponse(res, 200, "Discussion deleted.");
});

// PUT /api/discussions/:id/upvote
export const upvoteDiscussion = upvoteHandler(Discussion, discussionFilter, true);
// DELETE /api/discussions/:id/upvote
export const removeDiscussionUpvote = upvoteHandler(Discussion, discussionFilter, false);

// PUT / DELETE /api/discussions/:id/bookmark
export const bookmarkDiscussion = bookmarkHandler(true);
export const removeBookmark = bookmarkHandler(false);

// ─────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────

// POST /api/discussions/:id/comments
export const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body ?? {};
  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ success: false, message: "Content is required." });
  }
  if (content.trim().length > MAX_COMMENT_LENGTH) return tooLong(res, MAX_COMMENT_LENGTH);

  const discussion = await Discussion.findOne({ _id: req.params.id, isDeleted: false, isLocked: false });
  if (!discussion) {
    return res.status(404).json({ success: false, message: "Discussion not found or locked." });
  }

  const comment = await Comment.create({
    discussion: req.params.id,
    author: req.user._id,
    content: content.trim(),
  });

  await Discussion.findByIdAndUpdate(req.params.id, {
    $inc: { commentCount: 1 },
    lastActivityAt: new Date(),
  });

  if (discussion.author.toString() !== req.user._id.toString()) {
    createNotification({
      recipientId: discussion.author,
      type: "discussion_reply",
      title: "New reply to your discussion",
      message: `Someone replied to "${discussion.title}".`,
      targetType: "discussion",
      targetId: discussion._id,
      createdBy: req.user._id,
    });
  }

  await comment.populate("author", "firstName lastName branch year role");
  sendResponse(res, 201, "Comment added.", {
    ...shapeVotes(comment.toObject(), req.user._id),
    replies: [],
  });
});

// PUT / DELETE /api/discussions/:id/comments/:commentId/upvote
export const upvoteComment = upvoteHandler(Comment, commentFilter, true);
export const removeCommentUpvote = upvoteHandler(Comment, commentFilter, false);

// POST /api/discussions/:id/comments/:commentId/accept  (discussion author only)
export const acceptAnswer = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.id);
  if (!discussion) return res.status(404).json({ success: false, message: "Not found." });

  if (discussion.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Only the discussion author can accept an answer." });
  }

  // The comment must belong to THIS discussion — otherwise an author could
  // mark comments in anyone else's discussion as accepted.
  const target = await Comment.findOne({
    _id: req.params.commentId,
    discussion: discussion._id,
    isDeleted: false,
  }).select("_id");
  if (!target) return res.status(404).json({ success: false, message: "Comment not found." });

  await Comment.updateMany({ discussion: discussion._id }, { isAcceptedAnswer: false });
  const comment = await Comment.findOneAndUpdate(
    { _id: target._id, discussion: discussion._id },
    { isAcceptedAnswer: true },
    { new: true }
  ).lean();

  sendResponse(res, 200, "Answer accepted.", shapeVotes(comment, req.user._id));
});

// DELETE /api/discussions/:id/comments/:commentId  (soft delete)
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ success: false, message: "Not found." });

  const isOwner = comment.author.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "superadmin") {
    return res.status(403).json({ success: false, message: "Not authorised." });
  }

  // Flip isDeleted conditionally so a repeated delete is a no-op, and decrement
  // the comment's REAL parent — never whatever :id the URL names.
  const flipped = await Comment.updateOne(
    { _id: comment._id, isDeleted: false },
    { $set: { isDeleted: true } },
  );
  if (flipped.modifiedCount === 1) {
    await Discussion.updateOne({ _id: comment.discussion }, { $inc: { commentCount: -1 } });
  }
  sendResponse(res, 200, "Comment deleted.");
});

// ─────────────────────────────────────────────
// REPLIES  (supports reply-to-reply nesting)
// ─────────────────────────────────────────────

// POST /api/discussions/:id/comments/:commentId/replies
// Body: { content, parentReplyId? }
// - parentReplyId absent  → direct reply to comment
// - parentReplyId present → nested reply (reply to a reply)
export const addReply = asyncHandler(async (req, res) => {
  const { content, parentReplyId } = req.body ?? {};

  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ success: false, message: "Content is required." });
  }
  if (content.trim().length > MAX_COMMENT_LENGTH) return tooLong(res, MAX_COMMENT_LENGTH);
  if (parentReplyId !== undefined && parentReplyId !== null && typeof parentReplyId !== "string") {
    return res.status(400).json({ success: false, message: "Invalid parent reply." });
  }

  // The comment must belong to the discussion in the URL, and that discussion
  // must still accept replies (same rule as addComment).
  const comment = await Comment.findOne({
    _id: req.params.commentId,
    discussion: req.params.id,
    isDeleted: false,
  });
  if (!comment) return res.status(404).json({ success: false, message: "Comment not found." });
  const open = await Discussion.exists({ _id: comment.discussion, isDeleted: false, isLocked: false });
  if (!open) {
    return res.status(404).json({ success: false, message: "Discussion not found or locked." });
  }

  let replyingTo = null;

  if (parentReplyId) {
    const parentReply = await Reply.findOne({ _id: parentReplyId, isDeleted: false });
    if (!parentReply) {
      return res.status(404).json({ success: false, message: "Parent reply not found." });
    }
    // Ensure parent reply belongs to the same comment
    if (parentReply.comment.toString() !== req.params.commentId) {
      return res.status(400).json({ success: false, message: "Parent reply does not belong to this comment." });
    }
    replyingTo = parentReply.author;
  }

  const reply = await Reply.create({
    comment:     req.params.commentId,
    parentReply: parentReplyId || null,
    replyingTo,
    author:      req.user._id,
    content:     content.trim(),
  });

  await Comment.findByIdAndUpdate(comment._id, { $inc: { replyCount: 1 } });
  await Discussion.findByIdAndUpdate(comment.discussion, { lastActivityAt: new Date() });

  const replyRecipient = replyingTo || comment.author;
  if (replyRecipient.toString() !== req.user._id.toString()) {
    createNotification({
      recipientId: replyRecipient,
      type: "discussion_reply",
      title: "New reply",
      message: "Someone replied to your comment.",
      targetType: "discussion",
      targetId: req.params.id,
      createdBy: req.user._id,
    });
  }

  await reply.populate("author", "firstName lastName branch year role");
  await reply.populate("replyingTo", "firstName lastName");

  sendResponse(res, 201, "Reply added.", {
    ...shapeVotes(reply.toObject(), req.user._id),
    children: [],
  });
});

// PUT / DELETE /api/discussions/:id/comments/:commentId/replies/:replyId/upvote
export const upvoteReply = upvoteHandler(Reply, replyFilter, true);
export const removeReplyUpvote = upvoteHandler(Reply, replyFilter, false);

// DELETE /api/discussions/:id/comments/:commentId/replies/:replyId
export const deleteReply = asyncHandler(async (req, res) => {
  const reply = await Reply.findById(req.params.replyId);
  if (!reply) return res.status(404).json({ success: false, message: "Not found." });

  const isOwner = reply.author.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "superadmin") {
    return res.status(403).json({ success: false, message: "Not authorised." });
  }

  // Same rules as deleteComment: idempotent, and the counter belongs to the
  // reply's real parent comment.
  const flipped = await Reply.updateOne(
    { _id: reply._id, isDeleted: false },
    { $set: { isDeleted: true } },
  );
  if (flipped.modifiedCount === 1) {
    await Comment.updateOne({ _id: reply.comment }, { $inc: { replyCount: -1 } });
  }
  sendResponse(res, 200, "Reply deleted.");
});