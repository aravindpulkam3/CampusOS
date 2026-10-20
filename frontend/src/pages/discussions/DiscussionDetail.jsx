import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowBigUp, Bookmark, Lock, MessageSquare, Plus, Trash2 } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import {
  getDiscussionById,
  getDiscussions,
  getComments,
  upvoteDiscussion,
  unupvoteDiscussion,
  bookmarkDiscussion,
  unbookmarkDiscussion,
  addComment,
  deleteDiscussion,
} from "../../api/discussion.api";
import {
  Alert,
  LoadError,
  LoadMore,
  PageMessage,
  SectionHead,
  btn,
  btnGhost,
  btnGhostSm,
  btnLg,
  btnSm,
  crumbLink,
  focusRing,
  note,
  panel,
} from "../../components/common/ui";
import CommentBlock from "./CommentBlock";
import NewDiscussion from "./NewDiscussion";
import { Byline, Prose, Tag, act, actDanger, actOn, categoryLabel, plural } from "./discussionUi";
import useCursorList from "./useCursorList";
import useDocumentTitle from "../../hooks/useDocumentTitle";

// ─── Other discussions, beside the thread ─────────────────────
// A side list, so it loads on its own and simply stays away if it fails. The
// list request does not count a view.
const MoreDiscussions = ({ currentId }) => {
  const [list, setList] = useState([]);

  useEffect(() => {
    let alive = true;
    getDiscussions({ sort: "active", limit: 5 })
      .then((res) => {
        if (alive) setList(res.data.data.discussions.filter((d) => d._id !== currentId).slice(0, 4));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [currentId]);

  if (list.length === 0) return null;
  return (
    <section className="mt-9">
      <SectionHead title="More discussions" linkTo="/discussions" linkLabel="See all" />
      <ul className="divide-y divide-line">
        {list.map((d) => (
          <li key={d._id}>
            <Link to={`/discussions/${d._id}`} className={`group block rounded-lg py-3.5 ${focusRing}`}>
              <h3 className="line-clamp-2 break-words text-[15px] font-semibold leading-[1.35] tracking-[-0.018em] text-ink decoration-ink/25 underline-offset-[3px] group-hover:underline">
                {d.title}
              </h3>
              <p className="mt-0.5 text-[13.5px] text-ink-2">
                {plural(d.upvoteCount ?? 0, "vote", "votes")}, {plural(d.commentCount ?? 0, "reply", "replies")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
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
  useDocumentTitle(discussion?.title || "Discussion");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upvotes, setUpvotes] = useState(0);
  const [upvoted, setUpvoted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [votePending, setVotePending] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showNew, setShowNew] = useState(false);

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
        .catch((err) => {
          if (aliveRef.current)
            setError(err.response?.status === 404 ? "Discussion not found." : "Couldn't load this discussion.");
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
      setPostError(err.response?.data?.message || "Couldn't post your reply. Try again.");
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
      <div className="animate-pulse pb-10" aria-busy="true" aria-label="Loading discussion">
        <div className="mt-1 h-4 w-40 rounded bg-soft lg:mt-4" />
        <div className="mt-3 h-9 w-[28rem] max-w-full rounded-lg bg-soft" />
        <div className="mt-5 flex items-center gap-2.5">
          <div className="size-[30px] rounded-full bg-soft" />
          <div className="h-3.5 w-48 rounded bg-soft" />
        </div>
        <div className="mt-9 max-w-[64ch] space-y-3">
          <div className="h-4 w-full rounded bg-soft" />
          <div className="h-4 w-11/12 rounded bg-soft" />
          <div className="h-4 w-3/5 rounded bg-soft" />
        </div>
      </div>
    );
  if (error || !discussion)
    return (
      <PageMessage
        title={error || "Not found."}
        action={
          <Link to="/discussions" className={btnGhost}>
            Back to discussions
          </Link>
        }
      >
        {error && error !== "Discussion not found."
          ? "Check your connection and try again."
          : "It may have been deleted, or the link is incorrect."}
      </PageMessage>
    );

  const acceptedComment =
    (acceptedId && [...feed.items, ...feed.extra].find((c) => c._id === acceptedId)) ||
    acceptedSnapshot;
  const notAccepted = (c) => c._id !== acceptedId;
  const commentCount = discussion.commentCount ?? 0;
  const author = discussion.author;
  const canComment = user && !discussion.isLocked;
  const others = feed.items.filter(notAccepted);
  const newOnes = feed.extra.filter(notAccepted);
  // The accepted answer has its own place above, so the heading counts the rest.
  const restCount = commentCount - (acceptedComment ? 1 : 0);
  const repliesTitle = acceptedComment
    ? restCount > 0
      ? `${restCount} more ${restCount === 1 ? "reply" : "replies"}`
      : "Replies"
    : commentCount > 0
      ? plural(commentCount, "reply", "replies")
      : "Replies";

  const renderComment = (c) => (
    <CommentBlock
      key={c._id}
      comment={c}
      discussionId={id}
      currentUser={user}
      canReply={!!canComment}
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
    <div className="pb-10 lg:pb-20">
      {showNew && (
        <NewDiscussion
          onClose={() => setShowNew(false)}
          onCreated={(created) => navigate(`/discussions/${created._id}`)}
        />
      )}

      <header className="pt-1 lg:pt-4">
        <nav aria-label="Breadcrumb" className="mb-1.5 text-[14.5px] text-ink-3">
          <Link to="/discussions" className={crumbLink}>
            Discussions
          </Link>{" "}
          / {categoryLabel(discussion.category)}
        </nav>
        <h1
          id="discussion-title"
          className="max-w-[22ch] break-words text-[27px] font-[680] leading-[1.14] tracking-[-0.042em] text-ink lg:text-[34px]"
        >
          {discussion.title}
        </h1>
        <div className="mt-[18px]">
          <Byline
            user={author}
            date={discussion.createdAt}
            after={
              <span className="text-ink-3">{plural(discussion.views ?? 0, "view", "views")}</span>
            }
          >
            {(author?.branch || author?.year) && (
              <span className="text-ink-3">
                {[author?.branch, author?.year && `year ${author.year}`].filter(Boolean).join(", ")}
              </span>
            )}
            {discussion.isPinned && <Tag>Pinned</Tag>}
            {discussion.isLocked && <Tag>Locked</Tag>}
          </Byline>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-y-11 lg:mt-9 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-x-[72px]">
        <div className="min-w-0">
          {/* The post: body, tags, then its actions */}
          <article aria-labelledby="discussion-title">
            <Prose text={discussion.content} className="max-w-[64ch] text-base leading-[1.68]" />

            {discussion.tags?.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-x-3.5 gap-y-1 text-[13.5px] text-ink-3">
                {discussion.tags.map((tag) => (
                  <li key={tag}>#{tag}</li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5">
              <button
                type="button"
                onClick={handleUpvote}
                disabled={votePending}
                aria-pressed={upvoted}
                aria-label={`Upvote, ${plural(upvotes, "upvote", "upvotes")} so far`}
                className={`inline-flex h-[34px] items-center gap-1.5 rounded-full pl-[11px] pr-3.5 text-[13.5px] font-semibold tabular-nums transition-colors disabled:opacity-60 ${focusRing} focus-visible:ring-offset-2 ${
                  upvoted
                    ? "bg-ink text-white hover:bg-ink/85"
                    : "border border-line-2 bg-white text-ink hover:border-ink-3"
                }`}
              >
                <ArrowBigUp
                  size={18}
                  strokeWidth={1.75}
                  className={upvoted ? "fill-current" : ""}
                  aria-hidden="true"
                />
                {upvotes}
              </button>
              <button
                type="button"
                onClick={handleBookmark}
                disabled={bookmarkPending}
                aria-pressed={bookmarked}
                className={bookmarked ? actOn : act}
              >
                <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} aria-hidden="true" />
                {bookmarked ? "Bookmarked" : "Bookmark"}
              </button>
              {canComment && (
                <button type="button" onClick={openComposer} className={act}>
                  <MessageSquare size={15} aria-hidden="true" /> Reply
                </button>
              )}
              {(isDiscussionAuthor || user?.role === "superadmin") && (
                <button type="button" onClick={handleDelete} className={`ml-auto ${actDanger}`}>
                  <Trash2 size={14} aria-hidden="true" /> Delete discussion
                </button>
              )}
            </div>
            {deleteError && (
              <div className="mt-3">
                <Alert>{deleteError}</Alert>
              </div>
            )}
          </article>

          {/* The accepted answer is lifted out of the feed and shown first */}
          {acceptedComment && <div className="mt-11">{renderComment(acceptedComment)}</div>}

          <section aria-labelledby="discussion-replies" className="mt-12 lg:mt-14">
            <SectionHead
              id="discussion-replies"
              title={repliesTitle}
              aside={others.length + newOnes.length > 1 ? "Oldest first" : undefined}
            />

            {!feed.loaded && feed.loading ? (
              <div className="animate-pulse space-y-7 py-3" aria-label="Loading replies">
                {[0, 1].map((i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2.5">
                      <div className="size-[30px] rounded-full bg-soft" />
                      <div className="h-3.5 w-36 rounded bg-soft" />
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="h-3.5 w-full max-w-[62ch] rounded bg-soft" />
                      <div className="h-3.5 w-2/3 max-w-[40ch] rounded bg-soft" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !feed.loaded && feed.error ? (
              <LoadError onRetry={feed.loadMore}>Couldn't load replies.</LoadError>
            ) : !acceptedComment && others.length === 0 && newOnes.length === 0 ? (
              <p className={note}>
                {canComment ? "No replies yet. Be the first to respond." : "No replies yet."}
              </p>
            ) : (
              <>
                {/* Loaded replies, then paging, then replies posted here while
                    later pages are still unloaded */}
                <div className="divide-y divide-line [&>*:first-child]:pt-2">
                  {others.map(renderComment)}
                </div>

                {feed.error && <LoadError onRetry={feed.loadMore}>Couldn't load more replies.</LoadError>}
                {feed.hasMore && !feed.error && (
                  <LoadMore onClick={feed.loadMore} loading={feed.loading}>
                    Load more replies
                  </LoadMore>
                )}

                {newOnes.length > 0 && (
                  <div className="divide-y divide-line border-t border-line">{newOnes.map(renderComment)}</div>
                )}
              </>
            )}

            {/* Reply composer */}
            {canComment ? (
              !isFormExpanded ? (
                <button
                  type="button"
                  onClick={openComposer}
                  className={`mt-5 flex w-full items-center gap-3.5 py-3.5 pl-5 pr-3.5 text-left transition-colors hover:border-ink-3 ${panel} ${focusRing}`}
                >
                  <span className="min-w-0 flex-1 text-[15px] text-ink-3">Add to the discussion</span>
                  <span aria-hidden="true" className={btn}>
                    Post reply
                  </span>
                </button>
              ) : (
                <form onSubmit={handlePostComment} className={`mt-5 p-3.5 ${panel}`}>
                  <textarea
                    ref={textareaRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={4}
                    aria-label="Write a reply"
                    placeholder="Share your answer or perspective..."
                    className="block w-full resize-none bg-transparent px-1.5 py-1 text-[15px] leading-[1.6] text-ink outline-none placeholder:text-ink-3"
                  />
                  {postError && (
                    <div className="mt-2 px-1.5">
                      <Alert>{postError}</Alert>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFormExpanded(false);
                        setCommentText("");
                        setPostError("");
                      }}
                      className={btnGhostSm}
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={posting || !commentText.trim()} className={btnSm}>
                      {posting ? "Posting..." : "Post reply"}
                    </button>
                  </div>
                </form>
              )
            ) : discussion.isLocked ? (
              <p className={`mt-5 flex items-center gap-2 ${note}`}>
                <Lock size={14} className="flex-none text-ink-3" aria-hidden="true" /> This discussion is
                locked. New replies are turned off.
              </p>
            ) : (
              <p className={`mt-5 ${note}`}>
                <Link
                  to="/login"
                  className={`rounded font-[550] text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-ink ${focusRing}`}
                >
                  Sign in to reply
                </Link>
              </p>
            )}
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          {user && (
            <button type="button" onClick={() => setShowNew(true)} className={`w-full ${btnLg}`}>
              <Plus size={17} aria-hidden="true" /> Start a discussion
            </button>
          )}
          <MoreDiscussions currentId={id} />
        </aside>
      </div>
    </div>
  );
}
