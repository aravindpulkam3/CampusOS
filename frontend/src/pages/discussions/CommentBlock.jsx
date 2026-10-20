import { useState, useRef } from "react";
import { ArrowBigUp, CheckCircle2, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import {
  getReplies,
  upvoteComment,
  unupvoteComment,
  acceptAnswer,
  deleteComment,
  addReply,
  upvoteReply,
  unupvoteReply,
  deleteReply,
} from "../../api/discussion.api";
import { Alert, LoadError, btnSm, focusRing, panel, tone } from "../../components/common/ui";
import { Byline, Prose, Tag, act, actDanger, actOn, plural } from "./discussionUi";
import useCursorList from "./useCursorList";

// A top-level reply to a discussion (a "comment" in the API) and the thread of
// replies under it. The page calls both "replies"; the code keeps the API's
// names so the two levels stay distinct.

// Inline upvote for comments and replies; filled when it's the viewer's vote.
const VoteButton = ({ upvoted, count, pending, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={pending}
    aria-pressed={upvoted}
    aria-label={`${label}, ${plural(count, "upvote", "upvotes")} so far`}
    className={`tabular-nums ${upvoted ? actOn : act}`}
  >
    <ArrowBigUp size={17} strokeWidth={1.75} className={upvoted ? "fill-current" : ""} aria-hidden="true" />
    {count}
  </button>
);

// One bordered field: input, cancel, post. Wraps (buttons under the input) only
// when a deep reply leaves too little width, e.g. on phones.
const ReplyComposer = ({ inputRef, value, onChange, onSubmit, onCancel, submitting, placeholder }) => (
  <div className="mt-3 flex flex-wrap items-center gap-1 rounded-[11px] border border-line-2 bg-white p-1 transition-colors focus-within:border-ink-3 focus-within:ring-2 focus-within:ring-ink/10">
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        }
      }}
      aria-label={placeholder}
      placeholder={placeholder}
      className="min-w-0 flex-1 basis-40 bg-transparent px-2.5 py-1.5 text-[14.5px] text-ink outline-none placeholder:text-ink-3"
    />
    <div className="ml-auto flex items-center gap-1">
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel reply"
        className={`grid size-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-soft hover:text-ink ${focusRing}`}
      >
        <X size={15} aria-hidden="true" />
      </button>
      <button type="button" onClick={onSubmit} disabled={submitting || !value.trim()} className={btnSm}>
        {submitting ? "..." : "Post"}
      </button>
    </div>
  </div>
);

const body = "mt-2 max-w-[62ch] text-[15px] leading-[1.6]";
const actions = "mt-2.5 flex flex-wrap items-center gap-x-[18px] gap-y-1.5";
// The rule a thread of replies hangs from.
const threadLine = "border-l border-line-2 pl-3.5 sm:pl-5";

// ─── Reply tree ───────────────────────────────────────────────
// Flat oldest-first replies → tree via parentReply, in one pass. A reply whose
// parent isn't loaded (deleted: the server omits it) shows at the top level.
const buildReplyTree = (replies) => {
  const nodes = new Map(replies.map((r) => [String(r._id), { ...r, children: [] }]));
  const roots = [];
  for (const node of nodes.values()) {
    const parent = node.parentReply ? nodes.get(String(node.parentReply)) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
};

// Thread lines stop indenting past this depth so long chains fit on a phone.
// Visual only: deeper replies still render inside their parent.
const MAX_INDENT_DEPTH = 6;

// ─── Recursive Reply Node ─────────────────────────────────────
// Holds only UI state; reply data lives in the thread's flat list (onVote
// patches it) and the tree is rebuilt from that list on every render.
const ReplyNode = ({ reply, depth, ...ctx }) => {
  const { discussionId, commentId, currentUser, canReply, discussionAuthorId, onVote, onReply, onDeleted } = ctx;
  const [votePending, setVotePending] = useState(false);
  const [replyBox, setReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState(true); // nested replies start hidden
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const isOwner = currentUser && currentUser._id === (reply.author?._id ?? reply.author);
  const children = reply.children;

  const handleUpvote = async () => {
    if (!currentUser || votePending) return;
    setVotePending(true);
    try {
      const res = await (reply.upvoted ? unupvoteReply : upvoteReply)(
        discussionId,
        commentId,
        reply._id,
      );
      onVote(reply._id, res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setVotePending(false);
    }
  };

  const handleDelete = async () => {
    if (deleting || !window.confirm("Delete this reply?")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await deleteReply(discussionId, commentId, reply._id);
      onDeleted(reply._id, res.data.data.replyCount);
    } catch (err) {
      console.error(err);
      setError("Couldn't delete this reply. Try again.");
      setDeleting(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onReply(replyText.trim(), reply._id);
      setReplyText("");
      setReplyBox(false);
      setCollapsed(false); // the new reply lands under this one: make sure it's visible
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't post your reply. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isOP = discussionAuthorId && String(reply.author?._id ?? reply.author) === String(discussionAuthorId);

  return (
    <div className={depth <= MAX_INDENT_DEPTH ? threadLine : ""}>
      <div className={`py-2.5 ${deleting ? "opacity-50" : ""}`}>
        <Byline
          user={reply.author}
          date={reply.createdAt}
          after={reply.isEdited && <span className="text-ink-3">(edited)</span>}
        >
          {isOP && <Tag>Author</Tag>}
          {reply.author?.role === "superadmin" && <Tag>Admin</Tag>}
          {reply.replyingTo && (
            <span className="font-medium text-ink-2">@{reply.replyingTo.firstName}</span>
          )}
        </Byline>

        <Prose text={reply.content} className={body} />

        <div className={actions}>
          <VoteButton
            upvoted={reply.upvoted}
            count={reply.upvoteCount ?? 0}
            pending={votePending}
            onClick={handleUpvote}
            label="Upvote reply"
          />

          {canReply && (
            <button
              type="button"
              onClick={() => {
                setReplyBox(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className={act}
            >
              Reply
            </button>
          )}

          {/* Only loaded children are known here, so no count; the comment's
              "N replies" carries the real total. */}
          {children.length > 0 && (
            <button
              type="button"
              onClick={() => setCollapsed((p) => !p)}
              aria-expanded={!collapsed}
              aria-label={`${collapsed ? "Show" : "Hide"} replies to ${reply.author?.firstName ?? "this reply"}`}
              className={act}
            >
              {collapsed ? "Show replies" : "Hide replies"}
              {collapsed ? (
                <ChevronDown size={14} aria-hidden="true" />
              ) : (
                <ChevronUp size={14} aria-hidden="true" />
              )}
            </button>
          )}

          {(isOwner || currentUser?.role === "superadmin") && (
            <button type="button" onClick={handleDelete} disabled={deleting} className={`ml-auto ${actDanger}`}>
              Delete
            </button>
          )}
        </div>

        {replyBox && (
          <ReplyComposer
            inputRef={inputRef}
            value={replyText}
            onChange={setReplyText}
            onSubmit={handleSubmitReply}
            onCancel={() => {
              setReplyBox(false);
              setReplyText("");
            }}
            submitting={submitting}
            placeholder={`Reply to ${reply.author?.firstName}...`}
          />
        )}
        {error && (
          <div className="mt-2">
            <Alert>{error}</Alert>
          </div>
        )}
      </div>

      {!collapsed && children.length > 0 && (
        <div>
          {children.map((child) => (
            <ReplyNode key={child._id} reply={child} depth={depth + 1} {...ctx} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Comment (with its own lazily loaded reply thread) ────────
// Comment data comes from props (the feed is the single source of truth);
// changes flow back through onUpdate. Reply state lives in this comment's own
// useCursorList, so each thread loads, pages and fails independently.
const CommentBlock = ({
  comment,
  discussionId,
  currentUser,
  canReply, // false once the discussion is locked: the server refuses replies then
  isAccepted,
  canAccept,
  onUpdate,
  onAccepted,
  onDeleted,
  discussionAuthorId,
}) => {
  const [votePending, setVotePending] = useState(false);
  const [acceptPending, setAcceptPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [open, setOpen] = useState(false);
  const [replyBox, setReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");
  const replyRef = useRef(null);

  const thread = useCursorList((cursor) =>
    getReplies(discussionId, comment._id, cursor ? { cursor } : undefined).then((res) => ({
      items: res.data.data.replies,
      nextCursor: res.data.data.nextCursor,
      hasMore: res.data.data.hasMore,
    })),
  );

  const isOwner = currentUser && currentUser._id === (comment.author?._id ?? comment.author);
  const replyCount = comment.replyCount ?? 0;

  // The flat list is the only reply state; the tree is derived from it.
  const extraIds = new Set(thread.extra.map((r) => String(r._id)));
  const isNew = (node) => extraIds.has(String(node._id));
  const roots = buildReplyTree([...thread.items, ...thread.extra]);

  // Opening fetches the first page only once; hiding keeps what's loaded.
  const toggleThread = () => {
    if (!open && !thread.loaded) thread.loadMore();
    setOpen((o) => !o);
  };

  // Posts a reply (to the comment, or to a reply via parentReplyId). The count
  // always updates. A reply to a reply is posted from inside an open thread; a
  // reply to the comment itself opens the thread, so the poster sees it land.
  const postReply = async (content, parentReplyId) => {
    const res = await addReply(discussionId, comment._id, {
      content,
      ...(parentReplyId && { parentReplyId }),
    });
    const { reply, replyCount: count } = res.data.data;
    onUpdate(comment._id, { replyCount: count });
    thread.add(reply);
  };

  const handleDirectReplySubmit = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    setReplyError("");
    try {
      await postReply(replyText.trim());
      setReplyText("");
      setReplyBox(false);
      if (!open) {
        if (!thread.loaded) thread.loadMore();
        setOpen(true);
      }
    } catch (err) {
      setReplyError(err.response?.data?.message || "Couldn't post your reply. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyDeleted = (replyId, count) => {
    thread.remove(replyId);
    onUpdate(comment._id, { replyCount: count });
  };

  const renderReply = (node) => (
    <ReplyNode
      key={node._id}
      reply={node}
      depth={1}
      discussionId={discussionId}
      commentId={comment._id}
      currentUser={currentUser}
      canReply={canReply}
      onVote={thread.update}
      onReply={postReply}
      onDeleted={handleReplyDeleted}
      discussionAuthorId={discussionAuthorId}
    />
  );

  const handleUpvote = async () => {
    if (!currentUser || votePending) return;
    setVotePending(true);
    try {
      const res = await (comment.upvoted ? unupvoteComment : upvoteComment)(
        discussionId,
        comment._id,
      );
      onUpdate(comment._id, res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setVotePending(false);
    }
  };

  const handleAccept = async () => {
    if (acceptPending) return;
    setAcceptPending(true);
    setActionError("");
    try {
      await acceptAnswer(discussionId, comment._id);
      onAccepted(comment);
    } catch (err) {
      console.error(err);
      setActionError("Couldn't accept this answer. Try again.");
      setAcceptPending(false);
    }
  };

  const handleDeleteComment = async () => {
    if (deleting || !window.confirm("Delete this reply?")) return;
    setDeleting(true);
    setActionError("");
    try {
      const res = await deleteComment(discussionId, comment._id);
      onDeleted(comment._id, res.data.data.commentCount);
    } catch (err) {
      console.error(err);
      setActionError("Couldn't delete this reply. Try again.");
      setDeleting(false);
    }
  };

  const isOP = discussionAuthorId && String(comment.author?._id ?? comment.author) === String(discussionAuthorId);
  const canDelete = isOwner || currentUser?.role === "superadmin";

  // The accepted answer is lifted onto a panel; every other comment is a plain
  // block in the feed, which draws the rules between them.
  return (
    <article
      aria-label={`${isAccepted ? "Accepted answer" : "Reply"} by ${comment.author?.firstName ?? "someone"}`}
      className={`${isAccepted ? `px-5 py-5 lg:px-[26px] lg:pb-[26px] lg:pt-6 ${panel}` : "py-6"} ${
        deleting ? "opacity-50" : ""
      }`}
    >
      {isAccepted && (
        <p className={`mb-4 flex items-center gap-2 text-[13.5px] ${tone.live}`}>
          <CheckCircle2 size={16} aria-hidden="true" /> Accepted answer
        </p>
      )}

      <Byline user={comment.author} date={comment.createdAt}>
        {isOP && <Tag>Author</Tag>}
        {comment.author?.role === "superadmin" && <Tag>Admin</Tag>}
      </Byline>

      <Prose text={comment.content} className={body} />

      <div className={actions}>
        <VoteButton
          upvoted={comment.upvoted}
          count={comment.upvoteCount ?? 0}
          pending={votePending}
          onClick={handleUpvote}
          label="Upvote"
        />

        {canReply && (
          <button
            type="button"
            onClick={() => {
              setReplyBox((p) => !p);
              setTimeout(() => replyRef.current?.focus(), 50);
            }}
            className={act}
          >
            Reply
          </button>
        )}

        {replyCount > 0 && (
          <button type="button" onClick={toggleThread} aria-expanded={open} className={act}>
            {open ? "Hide replies" : plural(replyCount, "reply", "replies")}
            {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          </button>
        )}

        {canAccept && (
          <button type="button" onClick={handleAccept} disabled={acceptPending} className={act}>
            Accept as answer
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={handleDeleteComment}
            disabled={deleting}
            className={`ml-auto ${actDanger}`}
          >
            Delete
          </button>
        )}
      </div>
      {actionError && (
        <div className="mt-2">
          <Alert>{actionError}</Alert>
        </div>
      )}

      {replyBox && (
        <ReplyComposer
          inputRef={replyRef}
          value={replyText}
          onChange={setReplyText}
          onSubmit={handleDirectReplySubmit}
          onCancel={() => {
            setReplyBox(false);
            setReplyText("");
          }}
          submitting={submitting}
          placeholder="Write a reply..."
        />
      )}
      {replyError && (
        <div className="mt-2">
          <Alert>{replyError}</Alert>
        </div>
      )}

      {/* Loaded top-level replies, then paging controls, then top-level
          replies posted here while older pages are still unloaded. One keyed
          list, so a new reply that paging later moves into place is a
          reorder, not a remount (its open branches stay open). */}
      {open && (
        <div className="mt-4">
          {[
            ...roots.filter((n) => !isNew(n)).map(renderReply),
            <div key="thread-status" className={threadLine}>
              {thread.loading && (
                <p className="flex items-center gap-2 py-2 text-[13.5px] text-ink-2">
                  <Loader2 size={14} className="animate-spin text-ink-3" aria-hidden="true" /> Loading replies…
                </p>
              )}
              {thread.error && <LoadError onRetry={thread.loadMore}>Couldn't load replies.</LoadError>}
              {thread.hasMore && !thread.loading && !thread.error && (
                <button type="button" onClick={thread.loadMore} className={`my-2 ${act}`}>
                  Load more replies <ChevronDown size={14} aria-hidden="true" />
                </button>
              )}
            </div>,
            ...roots.filter(isNew).map(renderReply),
          ]}
        </div>
      )}
    </article>
  );
};

export default CommentBlock;
