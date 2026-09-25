import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  X,
  MessageSquare,
  Plus,
  TrendingUp,
  Clock,
  Activity,
  ArrowUp,
  Eye,
  Pin,
  Lock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useDebounce from "../../hooks/useDebounce";
import { getDiscussions, createDiscussion } from "../../api/discussion.api";
import { focusRing } from "../../components/common/SectionBits";
import {
  CATEGORY,
  CategoryChip,
  Avatar,
  relativeTime,
  plural,
  card,
  chip,
  btnPrimary,
  btnSecondary,
} from "./discussionUi";

// ─── Config ───────────────────────────────────────────────────
const CATEGORIES = [
  { value: "all", label: "All" },
  ...Object.entries(CATEGORY).map(([value, { label }]) => ({ value, label })),
];

const SORTS = [
  { value: "newest", label: "Newest", Icon: Clock },
  { value: "popular", label: "Popular", Icon: TrendingUp },
  { value: "active", label: "Active", Icon: Activity },
];

const inputClass =
  "w-full px-3 py-2 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 placeholder:text-slate-400 transition";

// Page numbers to show: first, last, and the current page's neighbours.
const pageWindow = (page, pages) => {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) out.push(p);
    else if (out[out.length - 1] !== "…") out.push("…");
  }
  return out;
};

// ─── Discussion Card ──────────────────────────────────────────
// One link, purely informational inside: the score is a stat, not a control
// (voting happens on the detail page), so the card's own hover/focus is the cue.
export const DiscussionCard = ({ discussion }) => {
  const upvotes = discussion.upvoteCount ?? 0;
  const comments = discussion.commentCount ?? 0;
  const author = discussion.author;

  return (
    <Link
      to={`/discussions/${discussion._id}`}
      aria-labelledby={`discussion-title-${discussion._id}`}
      className={`group flex gap-3 sm:gap-4 p-4 ${card} hover:border-slate-300 hover:shadow-[0_8px_20px_-12px_rgba(16,24,40,0.18)] transition ${focusRing}`}
    >
      <div
        className={`flex flex-col items-center gap-0.5 w-9 sm:w-11 py-2 rounded-xl bg-slate-50 flex-shrink-0 self-start ${
          discussion.upvoted ? "text-slate-900" : "text-slate-500"
        }`}
      >
        <ArrowUp size={13} strokeWidth={discussion.upvoted ? 3 : 2.25} aria-hidden="true" />
        <span aria-hidden="true" className={`text-sm leading-none tabular-nums ${discussion.upvoted ? "font-extrabold" : "font-bold"}`}>
          {upvotes}
        </span>
        <span className="sr-only">
          {plural(upvotes, "upvote", "upvotes")}
          {discussion.upvoted ? ", including yours" : ""}
        </span>
      </div>

      <div className="flex-1 min-w-0">
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
          {discussion.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="hidden sm:inline text-[11px] font-medium text-slate-500">
              #{tag}
            </span>
          ))}
        </div>

        <h3 id={`discussion-title-${discussion._id}`} className="mt-2 text-[15px] sm:text-base font-semibold text-slate-800 group-hover:text-slate-950 leading-snug tracking-tight line-clamp-2 break-words">
          {discussion.title}
        </h3>
        <p className="mt-1 text-[13px] text-slate-500 leading-relaxed line-clamp-2 break-words">
          {discussion.content}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar user={author} size="xs" />
            <span className="font-semibold text-slate-700 truncate">
              {author?.firstName} {author?.lastName}
            </span>
            {author?.branch && (
              <span className="hidden sm:inline whitespace-nowrap">· {author.branch}</span>
            )}
            <span className="whitespace-nowrap">· {relativeTime(discussion.createdAt)}</span>
          </div>
          <div className="flex items-center gap-3 font-medium">
            <span className="flex items-center gap-1">
              <MessageSquare size={13} className="text-slate-400" aria-hidden="true" />
              {comments}
              <span className="sr-only">{comments === 1 ? "comment" : "comments"}</span>
            </span>
            <span className="flex items-center gap-1">
              <Eye size={13} className="text-slate-400" aria-hidden="true" />
              {discussion.views ?? 0}
              <span className="sr-only">views</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────
export const Skeleton = () => (
  <div className="space-y-2.5" aria-label="Loading discussions">
    {[...Array(5)].map((_, i) => (
      <div key={i} className={`flex gap-3 sm:gap-4 p-4 ${card} animate-pulse`}>
        <div className="w-9 sm:w-11 h-12 rounded-xl bg-slate-100 flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="w-20 h-4 bg-slate-100 rounded-md" />
          <div className="w-3/4 h-4 bg-slate-100 rounded" />
          <div className="w-full h-3 bg-slate-100 rounded" />
          <div className="flex items-center justify-between pt-1">
            <div className="w-32 h-3 bg-slate-100 rounded" />
            <div className="w-14 h-3 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ─── Create Modal ─────────────────────────────────────────────
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CreateModal = ({ onClose, onCreated, returnFocusRef }) => {
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "general",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const openerRef = useRef(document.activeElement);

  // Keyboard: Escape closes; Tab / Shift+Tab wrap around inside the dialog
  // (and pull focus back in if it ever ends up outside).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = dialogRef.current.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus moves in when the modal opens, and back to whatever opened it when it
  // closes (Escape, ×, Cancel or a successful post). If that opener is gone —
  // e.g. the empty-state button after the first post — use the header button.
  useEffect(() => {
    titleRef.current?.focus();
    const opener = openerRef.current;
    const fallback = returnFocusRef;
    return () => (opener?.isConnected ? opener : fallback?.current)?.focus();
  }, [returnFocusRef]);

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || form.tags.includes(tag) || form.tags.length >= 5) return;
    setForm((p) => ({ ...p, tags: [...p.tags, tag] }));
    setTagInput("");
  };

  const removeTag = (tag) =>
    setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await createDiscussion(form);
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-discussion-title"
        className="bg-white rounded-2xl border border-slate-200/70 shadow-xl w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h3 id="new-discussion-title" className="text-base font-bold text-slate-900 tracking-tight">
              Start a discussion
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Ask a question or share something useful with your campus.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${focusRing}`}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="nd-title" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              ref={titleRef}
              id="nd-title"
              type="text"
              maxLength={200}
              placeholder="What do you want to discuss?"
              value={form.title}
              onChange={set("title")}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="nd-category" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Category
            </label>
            <select
              id="nd-category"
              value={form.category}
              onChange={set("category")}
              className={inputClass}
            >
              {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="nd-content" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="nd-content"
              rows={5}
              placeholder="Share your question, experience, or thoughts in detail..."
              value={form.content}
              onChange={set("content")}
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>

          <div>
            <label htmlFor="nd-tags" className="text-xs font-semibold text-slate-700 block mb-1.5">
              Tags <span className="text-slate-500 font-normal">(up to 5)</span>
            </label>
            <div className="flex gap-2">
              <input
                id="nd-tags"
                type="text"
                placeholder="e.g. dsa, gate, resume"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className={`${inputClass} flex-1 min-w-0`}
              />
              <button type="button" onClick={addTag} className={btnSecondary}>
                Add
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-md"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className={`p-0.5 rounded hover:text-red-600 transition-colors ${focusRing}`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Posting..." : "Post discussion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────
const Discussions = () => {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [showModal, setShowModal] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  // The page whose request failed (null = no error), so Try again repeats it
  // with the current filters, sort and search.
  const [loadError, setLoadError] = useState(null);
  const startButtonRef = useRef(null);
  const requestRef = useRef(0);

  const debouncedSearch = useDebounce(search, 400);

  // Only the newest request may update the list, so a slow older response (or
  // failure) can't overwrite the result for the current filters.
  const fetchDiscussions = useCallback(
    async (page = 1) => {
      const request = ++requestRef.current;
      setLoading(true);
      setLoadError(null);
      try {
        const res = await getDiscussions({
          category: activeCategory === "all" ? undefined : activeCategory,
          search: debouncedSearch || undefined,
          sort,
          page,
          limit: 5,
        });
        if (request !== requestRef.current) return;
        setDiscussions(res.data.data.discussions);
        setPagination(res.data.data.pagination);
      } catch (err) {
        if (request !== requestRef.current) return;
        console.error(err);
        setLoadError(page);
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [activeCategory, debouncedSearch, sort],
  );

  useEffect(() => {
    fetchDiscussions(1);
  }, [fetchDiscussions]);

  const handleCreated = (newDiscussion) => {
    setDiscussions((prev) => [newDiscussion, ...prev]);
  };

  const { page, pages } = pagination;

  return (
    <div className="max-w-3xl mx-auto">
      {showModal && (
        <CreateModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          returnFocusRef={startButtonRef}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Discussions</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Ask questions, share experiences, get guidance
            {pagination.total > 0 && (
              <span> · {plural(pagination.total, "discussion", "discussions")}</span>
            )}
          </p>
        </div>
        {user && (
          <button ref={startButtonRef} onClick={() => setShowModal(true)} className={btnPrimary}>
            <Plus size={14} /> Start discussion
          </button>
        )}
      </div>

      {/* Toolbar: search + sort, then category filters */}
      <div className={`${card} p-3 mb-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label="Search discussions"
              placeholder="Search discussions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 placeholder:text-slate-400 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 ${focusRing}`}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Sort discussions"
            className="flex items-center p-0.5 bg-slate-100 rounded-xl self-start sm:self-auto flex-shrink-0"
          >
            {SORTS.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setSort(value)}
                aria-pressed={sort === value}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[10px] transition ${focusRing} ${
                  sort === value
                    ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.1)]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon size={12} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div
          role="group"
          aria-label="Filter by category"
          className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100"
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${focusRing} ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {cat.value !== "all" && (
                  <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY[cat.value].dot}`} aria-hidden="true" />
                )}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <Skeleton />
      ) : loadError !== null ? (
        <div role="alert" className={`${card} flex flex-col items-center text-center px-6 py-10`}>
          <div className="w-11 h-11 rounded-2xl bg-red-50 ring-1 ring-red-100 flex items-center justify-center mb-3">
            <AlertCircle size={18} className="text-red-500" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Couldn't load discussions</p>
          <p className="mt-1 text-xs text-slate-500">
            Something went wrong on our side or with your connection. Your filters are kept.
          </p>
          <button onClick={() => fetchDiscussions(loadError)} className={`${btnSecondary} mt-4`}>
            <RotateCw size={13} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : discussions.length > 0 ? (
        <>
          <div className="space-y-2.5">
            {discussions.map((d) => (
              <DiscussionCard key={d._id} discussion={d} />
            ))}
          </div>
          {pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between sm:justify-center gap-2 mt-6">
              <button
                onClick={() => fetchDiscussions(page - 1)}
                disabled={page <= 1}
                className={btnSecondary}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="sm:hidden text-xs font-semibold text-slate-500">
                Page {page} of {pages}
              </span>
              <div className="hidden sm:flex items-center gap-1">
                {pageWindow(page, pages).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`} className="px-1 text-xs text-slate-500">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => fetchDiscussions(p)}
                      aria-current={p === page ? "page" : undefined}
                      className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${focusRing} ${
                        p === page ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>
              <button
                onClick={() => fetchDiscussions(page + 1)}
                disabled={page >= pages}
                className={btnSecondary}
              >
                Next <ChevronRight size={14} />
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className={`${card} flex flex-col items-center text-center px-6 py-10`}>
          <div className="w-11 h-11 rounded-2xl bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center mb-3">
            <MessageSquare size={18} className="text-slate-400" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {search ? `No discussions match "${search}"` : "No discussions yet"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {search
              ? "Try different words or another category."
              : "Be the first to start a discussion."}
          </p>
          {search ? (
            <button onClick={() => setSearch("")} className={`${btnSecondary} mt-4`}>
              Clear search
            </button>
          ) : (
            user && (
              <button onClick={() => setShowModal(true)} className={`${btnPrimary} mt-4`}>
                <Plus size={14} /> Start a discussion
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Discussions;
