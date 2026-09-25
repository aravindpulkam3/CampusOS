import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowUp,
  Bookmark,
  MessageSquare,
  Check,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  CornerDownRight,
  X,
  PenSquare,
  Pin,
  Lock,
  Eye,
  AlertCircle,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import {
  getDiscussionById,
  getComments,
  getReplies,
  upvoteDiscussion,
  unupvoteDiscussion,
  bookmarkDiscussion,
  unbookmarkDiscussion,
  addComment,
  upvoteComment,
  unupvoteComment,
  acceptAnswer,
  deleteComment,
  addReply,
  upvoteReply,
  unupvoteReply,
  deleteReply,
  deleteDiscussion,
} from "../../api/discussion.api";
import { focusRing, SectionHeader } from "../../components/common/SectionBits";
import {
  CategoryChip,
  Avatar,
  relativeTime,
  plural,
  card,
  chip,
  btnPrimary,
  btnSecondary,
  ghostBase,
  ghostAction,
} from "./discussionUi";

// ─── Small presentational pieces (this page only) ─────────────
const Spinner = () => (
  <span
    className="w-3 h-3 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"
    aria-hidden="true"
  />
);

const opChip = `${chip} bg-white text-slate-600 border-slate-300`;
const adminChip = `${chip} bg-slate-800 text-white border-slate-800`;

// Inline upvote for comments and replies; filled when it's the viewer's vote.
const VoteButton = ({ upvoted, count, pending, onClick, label }) => (
  <button
    onClick={onClick}
    disabled={pending}
    aria-label={label}
    className={`${ghostBase} tabular-nums ${
      upvoted
        ? "bg-slate-100 text-slate-900 hover:bg-slate-200"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    }`}
  >
    <ArrowUp size={12} strokeWidth={upvoted ? 3 : 2.25} aria-hidden="true" />
    <span className="tabular-nums">{count}</span>
  </button>
);

// One bordered pill: input, cancel, post. Wraps (buttons under the input) only
// when a deep reply leaves too little width, e.g. on phones.
const ReplyComposer = ({ inputRef, value, onChange, onSubmit, onCancel, submitting, placeholder }) => (
  <div className="mt-2 flex flex-wrap items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-900/5 transition">
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
      placeholder={placeholder}
      className="flex-1 basis-40 min-w-0 px-2.5 py-1.5 text-xs text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
    />
    <div className="flex items-center gap-1 ml-auto">
      <button
        onClick={onCancel}
        aria-label="Cancel reply"
        className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${focusRing}`}
      >
        <X size={13} />
      </button>
      <button
        onClick={onSubmit}
        disabled={submitting || !value.trim()}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors ${focusRing}`}
      >
        {submitting ? "..." : "Post"}
      </button>
    </div>
  </div>
);

// ─── Cursor-paged list ────────────────────────────────────────
// Shared by the comment feed and every reply thread (each thread has its own
// instance, so threads never affect one another). Pages arrive oldest-first.
// `extra` holds items posted here while later pages are still unloaded: they
// render after "Load more" (never pretending to follow the loaded page) and
// drop out once paging reaches them.
function useCursorList(fetchPage) {
  const [items, setItems] = useState([]);
  const [extra, setExtra] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const cursorRef = useRef(null);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // One request at a time: repeated clicks are no-ops while one is in flight,
  // and the cursor only advances on success, so a failed page is retried as-is.
  const loadMore = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setError(false);
    try {
      const page = await fetchPage(cursorRef.current);
      if (!aliveRef.current) return;
      const pageIds = new Set(page.items.map((i) => i._id));
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i._id));
        return [...prev, ...page.items.filter((i) => !seen.has(i._id))];
      });
      setExtra((prev) => prev.filter((i) => !pageIds.has(i._id)));
      cursorRef.current = page.nextCursor;
      setHasMore(page.hasMore);
      setLoaded(true);
    } catch {
      if (aliveRef.current) setError(true);
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setLoading(false);
    }
  };

  // A new item created here. Never fetched yet → the first load will include it.
  const add = (item) => {
    if (!loaded && !loading) return;
    if (loaded && !hasMore) setItems((p) => [...p, item]);
    else setExtra((p) => [...p, item]);
  };
  const remove = (id) => {
    setItems((p) => p.filter((i) => i._id !== id));
    setExtra((p) => p.filter((i) => i._id !== id));
  };
  const update = (id, patch) => {
    const apply = (p) => p.map((i) => (i._id === id ? { ...i, ...patch } : i));
    setItems(apply);
    setExtra(apply);
  };

  return { items, extra, hasMore, loaded, loading, error, loadMore, add, remove, update };
}

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
  const { discussionId, commentId, currentUser, discussionAuthorId, onVote, onReply, onDeleted } = ctx;
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

  const lineColor = depth <= 2 ? "border-slate-200" : "border-slate-200/60";
  const isOP = discussionAuthorId && String(reply.author?._id ?? reply.author) === String(discussionAuthorId);

  // Row: avatar (20px) + 6px gap, so content and the composer start at 26px;
  // the action row starts 8px earlier so its first label lines up with the text.
  return (
    <div className={depth <= MAX_INDENT_DEPTH ? `pl-3 border-l ${lineColor}` : ""}>
      <div className={`py-1.5 ${deleting ? "opacity-50" : ""}`}>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
          <Avatar user={reply.author} size="xs" />
          <span className="font-semibold text-slate-800">
            {reply.author?.firstName} {reply.author?.lastName}
          </span>
          {isOP && <span className={opChip} title="Original poster">OP</span>}
          {reply.author?.role === "superadmin" && <span className={adminChip}>Admin</span>}
          {reply.replyingTo && (
            <span className="font-medium text-blue-600">@{reply.replyingTo.firstName}</span>
          )}
          <span className="text-slate-500">· {relativeTime(reply.createdAt)}</span>
          {reply.isEdited && <span className="text-slate-500">(edited)</span>}
        </div>

        <p className="mt-0.5 ml-[26px] text-[13px] text-slate-700 leading-relaxed whitespace-pre-line break-words">
          {reply.content}
        </p>

        <div className="mt-0.5 ml-[18px] flex flex-wrap items-center gap-0.5">
          <VoteButton
            upvoted={reply.upvoted}
            count={reply.upvoteCount ?? 0}
            pending={votePending}
            onClick={handleUpvote}
            label={reply.upvoted ? "Remove upvote" : "Upvote reply"}
          />

          {currentUser && (
            <button
              onClick={() => {
                setReplyBox(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className={ghostAction}
            >
              <CornerDownRight size={12} aria-hidden="true" /> Reply
            </button>
          )}

          {/* Only loaded children are known here, so no count; the comment's
              "View N replies" carries the real total. */}
          {children.length > 0 && (
            <button
              onClick={() => setCollapsed((p) => !p)}
              aria-expanded={!collapsed}
              aria-label={`${collapsed ? "Show" : "Hide"} replies to ${reply.author?.firstName ?? "this reply"}`}
              className={`${ghostBase} text-slate-600 hover:bg-slate-100 hover:text-slate-900`}
            >
              {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              {collapsed ? "Show replies" : "Hide replies"}
            </button>
          )}

          {(isOwner || currentUser?.role === "superadmin") && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete reply"
              className={`${ghostBase} text-slate-500 hover:bg-red-50 hover:text-red-600`}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {replyBox && (
          <div className="ml-[26px]">
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
          </div>
        )}
        {error && <p className="ml-[26px] mt-1.5 text-xs font-medium text-red-600">{error}</p>}
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
  // always updates; a collapsed thread stays collapsed and renders nothing new.
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
    if (deleting || !window.confirm("Delete this comment?")) return;
    setDeleting(true);
    setActionError("");
    try {
      const res = await deleteComment(discussionId, comment._id);
      onDeleted(comment._id, res.data.data.commentCount);
    } catch (err) {
      console.error(err);
      setActionError("Couldn't delete this comment. Try again.");
      setDeleting(false);
    }
  };

  const isOP = discussionAuthorId && String(comment.author?._id ?? comment.author) === String(discussionAuthorId);
  const canDelete = isOwner || currentUser?.role === "superadmin";

  // Header: avatar (28px) + 10px gap, so content starts at 38px; the action row
  // starts 8px earlier so its first label lines up with the text. The reply
  // thread hangs from the avatar's centre line (14px).
  return (
    <article
      aria-label={`Comment by ${comment.author?.firstName ?? "someone"}`}
      className={`bg-white border rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden ${
        isAccepted ? "border-emerald-200 ring-1 ring-emerald-100" : "border-slate-200/70"
      } ${deleting ? "opacity-50" : ""}`}
    >
      {isAccepted && (
        <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50/70 border-b border-emerald-100 text-[11px] font-bold text-emerald-700">
          <CheckCircle2 size={13} aria-hidden="true" /> Accepted answer
        </div>
      )}

      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-center gap-2.5">
          <Avatar user={comment.author} size="sm" />
          <div className="min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-[13px] font-semibold text-slate-800">
              {comment.author?.firstName} {comment.author?.lastName}
            </span>
            {isOP && <span className={opChip} title="Original poster">OP</span>}
            {comment.author?.role === "superadmin" && <span className={adminChip}>Admin</span>}
            <span className="text-xs text-slate-500">· {relativeTime(comment.createdAt)}</span>
          </div>
        </div>

        <p className="mt-1 ml-[38px] text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">
          {comment.content}
        </p>

        <div className="mt-1.5 ml-[30px] flex flex-wrap items-center gap-0.5">
          <VoteButton
            upvoted={comment.upvoted}
            count={comment.upvoteCount ?? 0}
            pending={votePending}
            onClick={handleUpvote}
            label={comment.upvoted ? "Remove upvote" : "Upvote comment"}
          />

          {currentUser && (
            <button
              onClick={() => {
                setReplyBox((p) => !p);
                setTimeout(() => replyRef.current?.focus(), 50);
              }}
              className={ghostAction}
            >
              <CornerDownRight size={12} aria-hidden="true" /> Reply
            </button>
          )}

          {replyCount > 0 && (
            <button
              onClick={toggleThread}
              aria-expanded={open}
              className={`${ghostBase} text-slate-700 hover:bg-slate-100 hover:text-slate-900`}
            >
              {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {open ? "Hide replies" : `View ${plural(replyCount, "reply", "replies")}`}
            </button>
          )}

          {canAccept && (
            <button
              onClick={handleAccept}
              disabled={acceptPending}
              className={`${ghostBase} text-slate-500 hover:bg-emerald-50 hover:text-emerald-700`}
            >
              <Check size={12} aria-hidden="true" /> Accept
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDeleteComment}
              disabled={deleting}
              aria-label="Delete comment"
              className={`${ghostBase} ml-auto text-slate-500 hover:bg-red-50 hover:text-red-600`}
            >
              <Trash2 size={12} aria-hidden="true" /> <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>
        {actionError && <p className="ml-[38px] mt-1.5 text-xs font-medium text-red-600">{actionError}</p>}

        {replyBox && (
          <div className="ml-[38px]">
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
          </div>
        )}
        {replyError && <p className="ml-[38px] mt-1.5 text-xs font-medium text-red-600">{replyError}</p>}

        {/* Loaded top-level replies, then paging controls, then top-level
            replies posted here while older pages are still unloaded. One keyed
            list, so a new reply that paging later moves into place is a
            reorder, not a remount (its open branches stay open). */}
        {open && (
          <div className="mt-2 ml-[13px]">
            {[
              ...roots.filter((n) => !isNew(n)).map(renderReply),
              <div key="thread-status" className="pl-3">
                {thread.loading && (
                  <p className="flex items-center gap-2 py-2 text-xs font-medium text-slate-500">
                    <Spinner /> Loading replies…
                  </p>
                )}
                {thread.error && (
                  <div className="my-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
                    <AlertCircle size={13} aria-hidden="true" />
                    <span>Couldn't load replies.</span>
                    <button
                      onClick={thread.loadMore}
                      className={`font-bold underline underline-offset-2 hover:text-red-800 rounded ${focusRing}`}
                    >
                      Try again
                    </button>
                  </div>
                )}
                {thread.hasMore && !thread.loading && !thread.error && (
                  <button
                    onClick={thread.loadMore}
                    className={`${ghostBase} -ml-2 my-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900`}
                  >
                    <ChevronDown size={12} aria-hidden="true" /> Load more replies
                  </button>
                )}
              </div>,
              ...roots.filter(isNew).map(renderReply),
            ]}
          </div>
        )}
      </div>
    </article>
  );
};

// ─── Main Page ────────────────────────────────────────────────
// Keyed by id: opening another discussion starts from fresh state, and any
// late response for the previous one lands in an unmounted tree (ignored).
export default function DiscussionDetailPage() {
  const { id } = useParams();
  return <DiscussionDetail key={id} id={id} />;
}

function DiscussionDetail({ id }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [discussion, setDiscussion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upvotes, setUpvotes] = useState(0);
  const [upvoted, setUpvoted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [votePending, setVotePending] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Accepted answer: pinned above the feed. The feed copy (when that page is
  // loaded) is the one shown; the snapshot from GET /discussions/:id only
  // stands in until then. "Accepted" is derived from acceptedId.
  const [acceptedId, setAcceptedId] = useState(null);
  const [acceptedSnapshot, setAcceptedSnapshot] = useState(null);

  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const textareaRef = useRef(null);

  const feed = useCursorList((cursor) =>
    getComments(id, cursor ? { cursor } : undefined).then((res) => ({
      items: res.data.data.comments,
      nextCursor: res.data.data.nextCursor,
      hasMore: res.data.data.hasMore,
    })),
  );

  // The discussion request counts a view, so it runs exactly once per page
  // open (the started ref also absorbs StrictMode's double effect). The first
  // comments page loads in parallel with its own loading state.
  const aliveRef = useRef(true);
  const startedRef = useRef(false);
  useEffect(() => {
    aliveRef.current = true;
    if (!startedRef.current) {
      startedRef.current = true;
      getDiscussionById(id)
        .then((res) => {
          if (!aliveRef.current) return;
          const { discussion: d, acceptedAnswer } = res.data.data;
          setDiscussion(d);
          setUpvotes(d.upvoteCount ?? 0);
          setUpvoted(!!d.upvoted);
          setBookmarked(!!d.bookmarked);
          setAcceptedId(acceptedAnswer?._id ?? null);
          setAcceptedSnapshot(acceptedAnswer);
        })
        .catch(() => {
          if (aliveRef.current) setError("Discussion not found.");
        })
        .finally(() => {
          if (aliveRef.current) setLoading(false);
        });
      feed.loadMore();
    }
    return () => {
      aliveRef.current = false;
    };
  }, [id]);

  // Each control sends the desired state and stays disabled until its request
  // settles, so an older response can never overwrite a newer state.
  const handleUpvote = async () => {
    if (!user || votePending) return;
    setVotePending(true);
    try {
      const res = await (upvoted ? unupvoteDiscussion : upvoteDiscussion)(id);
      setUpvotes(res.data.data.upvoteCount);
      setUpvoted(res.data.data.upvoted);
    } catch (err) {
      console.error(err);
    } finally {
      setVotePending(false);
    }
  };

  const handleBookmark = async () => {
    if (!user || bookmarkPending) return;
    setBookmarkPending(true);
    try {
      const res = await (bookmarked ? unbookmarkDiscussion : bookmarkDiscussion)(id);
      setBookmarked(res.data.data.bookmarked);
    } catch (err) {
      console.error(err);
    } finally {
      setBookmarkPending(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || posting) return;
    setPosting(true);
    setPostError("");
    try {
      const res = await addComment(id, { content: commentText.trim() });
      const { comment, commentCount } = res.data.data;
      feed.add(comment);
      setDiscussion((d) => ({ ...d, commentCount }));
      setCommentText("");
      setIsFormExpanded(false);
    } catch (err) {
      setPostError(err.response?.data?.message || "Couldn't post your comment. Try again.");
    } finally {
      setPosting(false);
    }
  };

  // Patches a comment wherever it is held; only one copy is ever displayed.
  const updateComment = (commentId, patch) => {
    feed.update(commentId, patch);
    if (commentId === acceptedId) setAcceptedSnapshot((s) => (s ? { ...s, ...patch } : s));
  };

  const handleAccepted = (comment) => {
    setAcceptedId(comment._id);
    setAcceptedSnapshot(comment);
  };

  const handleCommentDeleted = (commentId, commentCount) => {
    feed.remove(commentId);
    if (commentId === acceptedId) {
      setAcceptedId(null);
      setAcceptedSnapshot(null);
    }
    setDiscussion((d) => ({ ...d, commentCount }));
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this discussion? This can't be undone.")) return;
    setDeleteError("");
    try {
      await deleteDiscussion(id);
      navigate("/discussions");
    } catch (err) {
      console.error(err);
      setDeleteError("Couldn't delete this discussion. Try again.");
    }
  };

  const isDiscussionAuthor =
    user && discussion && user._id === (discussion.author?._id ?? discussion.author);

  if (loading)
    return (
      <div className="max-w-3xl mx-auto" aria-busy="true" aria-label="Loading discussion">
        <div className="h-3 w-44 bg-slate-100 rounded mb-4 animate-pulse" />
        <div className={`${card} p-4 sm:p-6 space-y-4 animate-pulse`}>
          <div className="w-20 h-4 bg-slate-100 rounded-md" />
          <div className="w-2/3 h-6 bg-slate-100 rounded-lg" />
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-slate-100 rounded-full" />
            <div className="space-y-1.5">
              <div className="w-28 h-3 bg-slate-100 rounded" />
              <div className="w-40 h-3 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <div className="w-full h-3 bg-slate-100 rounded" />
            <div className="w-11/12 h-3 bg-slate-100 rounded" />
            <div className="w-3/5 h-3 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  if (error || !discussion)
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className={`${card} flex flex-col items-center text-center px-6 py-10`}>
          <div className="w-11 h-11 rounded-2xl bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center mb-3">
            <MessageSquare size={18} className="text-slate-400" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-800">{error || "Not found."}</p>
          <p className="mt-1 text-xs text-slate-500">It may have been deleted, or the link is incorrect.</p>
          <Link to="/discussions" className={`${btnSecondary} mt-4`}>
            <ChevronLeft size={14} aria-hidden="true" /> Back to discussions
          </Link>
        </div>
      </div>
    );

  const acceptedComment =
    (acceptedId && [...feed.items, ...feed.extra].find((c) => c._id === acceptedId)) ||
    acceptedSnapshot;
  const notAccepted = (c) => c._id !== acceptedId;
  const commentCount = discussion.commentCount ?? 0;
  const author = discussion.author;
  const canComment = user && !discussion.isLocked;

  const renderComment = (c) => (
    <CommentBlock
      key={c._id}
      comment={c}
      discussionId={id}
      currentUser={user}
      isAccepted={c._id === acceptedId}
      canAccept={!!isDiscussionAuthor && c._id !== acceptedId}
      onUpdate={updateComment}
      onAccepted={handleAccepted}
      onDeleted={handleCommentDeleted}
      discussionAuthorId={author?._id ?? author}
    />
  );

  const openComposer = () => {
    setIsFormExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 mb-4 text-xs font-medium text-slate-500">
        <Link
          to="/discussions"
          className={`flex items-center gap-0.5 flex-shrink-0 rounded hover:text-slate-900 transition-colors ${focusRing}`}
        >
          <ChevronLeft size={14} aria-hidden="true" /> Discussions
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-700 truncate">{discussion.title}</span>
      </nav>

      {/* Discussion: header · body · action bar */}
      <article aria-labelledby="discussion-title" className={`${card} overflow-hidden mb-4`}>
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryChip category={discussion.category} dot />
              {discussion.isPinned && (
                <span className={`${chip} bg-slate-800 text-white border-slate-800`}>
                  <Pin size={9} aria-hidden="true" /> Pinned
                </span>
              )}
              {discussion.isLocked && (
                <span className={`${chip} bg-slate-100 text-slate-600 border-slate-200`}>
                  <Lock size={9} aria-hidden="true" /> Locked
                </span>
              )}
              {acceptedComment && (
                <span className={`${chip} bg-emerald-50 text-emerald-700 border-emerald-100`}>
                  <Check size={10} aria-hidden="true" /> Answered
                </span>
              )}
            </div>

            {(isDiscussionAuthor || user?.role === "superadmin") && (
              <button
                onClick={handleDelete}
                className={`p-1.5 -m-1 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0 ${focusRing}`}
                title="Delete discussion"
                aria-label="Delete discussion"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          {deleteError && <p className="mt-2 text-xs font-medium text-red-600">{deleteError}</p>}

          <h1
            id="discussion-title"
            className="mt-3 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug break-words"
          >
            {discussion.title}
          </h1>

          <div className="mt-3 flex items-center gap-2.5 min-w-0">
            <Avatar user={author} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {author?.firstName} {author?.lastName}
              </p>
              <p className="text-xs text-slate-500">
                {[author?.branch, author?.year && `Year ${author.year}`, relativeTime(discussion.createdAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>

          <p className="mt-5 text-[15px] text-slate-700 leading-7 whitespace-pre-line break-words">
            {discussion.content}
          </p>

          {discussion.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {discussion.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpvote}
              disabled={votePending}
              aria-pressed={upvoted}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors disabled:opacity-60 ${focusRing} ${
                upvoted
                  ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:text-slate-900"
              }`}
            >
              <ArrowUp size={13} strokeWidth={upvoted ? 3 : 2.25} aria-hidden="true" />
              <span className="tabular-nums">{upvotes}</span> upvote{upvotes !== 1 ? "s" : ""}
            </button>
            <button
              onClick={handleBookmark}
              disabled={bookmarkPending}
              aria-pressed={bookmarked}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors disabled:opacity-60 ${focusRing} ${
                bookmarked
                  ? "bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-300"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:text-slate-900"
              }`}
            >
              <Bookmark size={13} fill={bookmarked ? "currentColor" : "none"} aria-hidden="true" />
              {bookmarked ? "Saved" : "Save"}
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <Eye size={13} className="text-slate-400" aria-hidden="true" />
              {plural(discussion.views ?? 0, "view", "views")}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={13} className="text-slate-400" aria-hidden="true" />
              {plural(commentCount, "comment", "comments")}
            </span>
          </div>
        </div>
      </article>

      {/* Comment composer */}
      {canComment ? (
        <div className="mb-6">
          {!isFormExpanded ? (
            <button
              type="button"
              onClick={openComposer}
              className={`w-full flex items-center gap-3 px-4 py-3 ${card} text-left hover:border-slate-300 transition-colors ${focusRing}`}
            >
              <Avatar user={user} size="sm" />
              <span className="flex-1 min-w-0 text-sm text-slate-500">Write a comment...</span>
              <span
                aria-hidden="true"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg"
              >
                <PenSquare size={12} /> Comment
              </span>
            </button>
          ) : (
            <form onSubmit={handlePostComment} className={`${card} p-4`}>
              <div className="flex gap-3">
                <Avatar user={user} size="sm" />
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={4}
                  aria-label="Write a comment"
                  placeholder="Share your answer or perspective..."
                  className="flex-1 min-w-0 px-3 py-2 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 placeholder:text-slate-400 resize-none leading-relaxed transition"
                />
              </div>
              {postError && <p className="mt-2 ml-10 text-xs font-medium text-red-600">{postError}</p>}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormExpanded(false);
                    setCommentText("");
                    setPostError("");
                  }}
                  className={btnSecondary}
                >
                  Cancel
                </button>
                <button type="submit" disabled={posting || !commentText.trim()} className={btnPrimary}>
                  {posting ? (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Post comment"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 px-4 py-3 mb-6 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs font-medium text-slate-600">
          {discussion.isLocked ? (
            <>
              <Lock size={13} className="text-slate-500" aria-hidden="true" /> This discussion is locked. New
              comments are turned off.
            </>
          ) : (
            <Link
              to="/login"
              className={`font-bold text-slate-900 hover:underline underline-offset-2 rounded ${focusRing}`}
            >
              Sign in to comment
            </Link>
          )}
        </div>
      )}

      {/* Comments: accepted answer pinned first, then the paged feed */}
      <section aria-labelledby="discussion-comments" className="mb-4">
        <SectionHeader
          id="discussion-comments"
          icon={MessageSquare}
          title="Comments"
          count={commentCount}
          titleClassName="text-sm font-bold text-slate-800"
        />

        {!feed.loaded && feed.loading ? (
          <div className="space-y-3" aria-label="Loading comments">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${card} p-4 animate-pulse`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-slate-100 rounded-full" />
                  <div className="w-32 h-3 bg-slate-100 rounded" />
                </div>
                <div className="ml-[38px] mt-3 space-y-2">
                  <div className="w-full h-3 bg-slate-100 rounded" />
                  <div className="w-2/3 h-3 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !feed.loaded && feed.error ? (
          <div className={`${card} flex flex-wrap items-center justify-between gap-3 px-4 py-4`}>
            <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <AlertCircle size={14} className="text-red-500" aria-hidden="true" /> Couldn't load comments.
            </p>
            <button onClick={feed.loadMore} className={btnSecondary}>
              Try again
            </button>
          </div>
        ) : !acceptedComment && feed.items.length === 0 && feed.extra.length === 0 ? (
          <div className={`${card} flex flex-col items-center text-center px-6 py-10`}>
            <div className="w-11 h-11 rounded-2xl bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center mb-3">
              <MessageSquare size={18} className="text-slate-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No comments yet</p>
            <p className="mt-1 text-xs text-slate-500">Be the first to respond.</p>
            {canComment && !isFormExpanded && (
              <button onClick={openComposer} className={`${btnPrimary} mt-4`}>
                <PenSquare size={13} aria-hidden="true" /> Write the first comment
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {acceptedComment && renderComment(acceptedComment)}
            {feed.items.filter(notAccepted).map(renderComment)}

            {feed.error && (
              <p className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-red-700">
                <AlertCircle size={13} aria-hidden="true" /> Couldn't load more comments.
                <button
                  onClick={feed.loadMore}
                  className={`font-bold underline underline-offset-2 hover:text-red-800 rounded ${focusRing}`}
                >
                  Try again
                </button>
              </p>
            )}
            {feed.hasMore && !feed.error && (
              <button
                onClick={feed.loadMore}
                disabled={feed.loading}
                className={`${btnSecondary} w-full py-2.5`}
              >
                {feed.loading ? (
                  <>
                    <Spinner /> Loading…
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} aria-hidden="true" /> Load more comments
                  </>
                )}
              </button>
            )}

            {feed.extra.filter(notAccepted).map(renderComment)}
          </div>
        )}
      </section>
    </div>
  );
}
