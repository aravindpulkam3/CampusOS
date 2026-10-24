import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useDebounce from "../../hooks/useDebounce";
import { getDiscussions } from "../../api/discussion.api";
import {
  Chips,
  LoadError,
  PageNumbers,
  PageTitle,
  SearchField,
  SectionHead,
  Tabs,
  btnLg,
  focusRing,
  note,
} from "../../components/common/ui";
import { formatDateTime, formatTimeAgo } from "../../utils/formatDate";
import NewDiscussion from "./NewDiscussion";
import { CATEGORY, Tag, categoryLabel, plural } from "./discussionUi";

// ─── Config ───────────────────────────────────────────────────
const PAGE_SIZE = 8;

const CATEGORIES = [
  { value: "all", label: "All topics" },
  ...Object.entries(CATEGORY).map(([value, label]) => ({ value, label })),
];

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "active", label: "Active" },
  { key: "popular", label: "Most viewed" },
];

// "Yesterday" → "yesterday" for the middle of a sentence; "11 Sep" is left alone.
const midSentence = (text) => text.charAt(0).toLowerCase() + text.slice(1);

// ─── One discussion ───────────────────────────────────────────
// The whole row is the link, purely informational inside: the score is a stat,
// not a control (voting happens on the thread page).
const DiscussionRow = ({ discussion }) => {
  const upvotes = discussion.upvoteCount ?? 0;
  const comments = discussion.commentCount ?? 0;
  const author = discussion.author;

  return (
    <li className="group relative grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-x-3.5 py-5 sm:gap-x-5">
      <span
        className={`grid h-[52px] w-11 content-center justify-items-center rounded-xl bg-soft leading-[1.1] ${
          discussion.upvoted ? "ring-1 ring-inset ring-ink-2" : ""
        }`}
      >
        <b aria-hidden="true" className="text-base font-[680] tracking-[-0.02em] text-ink">
          {upvotes}
        </b>
        <span aria-hidden="true" className="text-[11px] text-ink-3">
          {upvotes === 1 ? "vote" : "votes"}
        </span>
        <span className="sr-only">
          {plural(upvotes, "upvote", "upvotes")}
          {discussion.upvoted ? ", including yours" : ""}
        </span>
      </span>

      <div className="min-w-0">
        <h3 className="line-clamp-2 break-words text-[16.5px] font-semibold leading-[1.35] tracking-[-0.025em] text-ink">
          {(discussion.isPinned || discussion.isLocked) && (
            <span className="mr-2 inline-flex gap-1.5 align-[2px]">
              {discussion.isPinned && <Tag>Pinned</Tag>}
              {discussion.isLocked && <Tag>Locked</Tag>}
            </span>
          )}
          <Link
            to={`/discussions/${discussion._id}`}
            className="decoration-ink/25 underline-offset-[3px] outline-none after:absolute after:inset-0 after:rounded-lg group-hover:underline focus-visible:after:ring-2 focus-visible:after:ring-ink/25"
          >
            {discussion.title}
          </Link>
        </h3>
        <p className="mt-[3px] truncate text-[14.5px] text-ink-2">{discussion.content}</p>
        <p className="mt-2 text-[13px] text-ink-3">
          <b className="font-[550] text-ink-2">
            {author?.firstName} {author?.lastName}
          </b>{" "}
          in {categoryLabel(discussion.category)},{" "}
          <time
            dateTime={discussion.createdAt}
            title={formatDateTime(discussion.createdAt)}
            className="whitespace-nowrap"
          >
            {midSentence(formatTimeAgo(discussion.createdAt))}
          </time>
        </p>
      </div>

      <p className="whitespace-nowrap pt-[3px] text-right text-[13.5px] text-ink-2">
        {plural(comments, "reply", "replies")}
        <span className="block text-[13px] text-ink-3">{plural(discussion.views ?? 0, "view", "views")}</span>
      </p>
    </li>
  );
};

const Skeleton = () => (
  <div className="animate-pulse" aria-busy="true" aria-label="Loading discussions">
    {[0, 1, 2, 3, 4].map((i) => (
      <div key={i} className="flex gap-5 border-t border-line py-5 first:border-t-0">
        <div className="h-[52px] w-11 flex-none rounded-xl bg-soft" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-4 w-2/3 rounded bg-soft" />
          <div className="h-3.5 w-full rounded bg-soft" />
          <div className="h-3 w-40 rounded bg-soft" />
        </div>
      </div>
    ))}
  </div>
);

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
  const [loaded, setLoaded] = useState(false);
  const startButtonRef = useRef(null);
  const requestRef = useRef(0);
  const inputRef = useRef("");

  // Typing waits 400 ms; clearing the box applies on the next tick, so the
  // cleared value (not the previous word) is what the next word starts from.
  const debouncedSearch = useDebounce(search, search.trim() ? 400 : 0);
  const query = debouncedSearch.trim();
  inputRef.current = search.trim();
  // False while the box holds text not yet searched for.
  const settled = search.trim() === query;

  // A response applies only if it is the newest request AND still matches the
  // box, so neither a slow older response (or failure) nor one that lands
  // during the debounce can overwrite the list.
  const fetchDiscussions = useCallback(
    async (page = 1) => {
      const request = ++requestRef.current;
      const isCurrent = () => request === requestRef.current && query === inputRef.current;
      setLoading(true);
      setLoadError(null);
      try {
        const res = await getDiscussions({
          category: activeCategory === "all" ? undefined : activeCategory,
          search: query || undefined,
          sort,
          page,
          limit: PAGE_SIZE,
        });
        if (!isCurrent()) return;
        setDiscussions(res.data.data.discussions);
        setPagination(res.data.data.pagination);
        setLoaded(true);
      } catch (err) {
        if (!isCurrent()) return;
        console.error(err);
        setLoadError(page);
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [activeCategory, query, sort],
  );

  // Fetches once the box settles, including when it is typed back to the
  // query already searched (whose response may have been ignored meanwhile).
  useEffect(() => {
    if (settled) fetchDiscussions(1);
  }, [fetchDiscussions, settled]);

  const handleCreated = (newDiscussion) => {
    if (query || activeCategory !== "all" || pagination.page !== 1) {
      fetchDiscussions(1);
      return;
    }
    setDiscussions((prev) => [newDiscussion, ...prev]);
    setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
  };

  const busy = loading || !settled;

  const { page, pages, total } = pagination;
  const first = (page - 1) * PAGE_SIZE + 1;

  return (
    <div className="pb-10 lg:pb-20">
      {showModal && (
        <NewDiscussion
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          returnFocusRef={startButtonRef}
        />
      )}

      <PageTitle title="Discussions" />

      <div className="mt-6">
        <Tabs label="Sort discussions" tabs={SORTS} value={sort} onChange={setSort} />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-y-5 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-x-[72px]">
        <section aria-labelledby="discussion-list" className="min-w-0">
          <h2 id="discussion-list" className="sr-only">
            Discussion list
          </h2>
          <SearchField
            value={search}
            onChange={setSearch}
            label="Search discussions"
            placeholder="Search discussions"
            maxLength={100}
            className=""
          />

          {/* After the first load the list stays in place, dimmed, while a newer one is coming */}
          <div
            aria-busy={busy}
            className={`mt-2 transition-opacity ${loaded && busy ? "opacity-60" : ""}`}
          >
            {!loaded && loading ? (
              <Skeleton />
            ) : loadError !== null ? (
              <div className="mt-5">
                <LoadError onRetry={() => fetchDiscussions(loadError)}>
                  Couldn't load discussions. Your filters are kept.
                </LoadError>
              </div>
            ) : discussions.length > 0 ? (
              <>
                <ul className="divide-y divide-line">
                  {discussions.map((d) => (
                    <DiscussionRow key={d._id} discussion={d} />
                  ))}
                </ul>
                <PageNumbers page={page} pages={pages} onPage={fetchDiscussions}>
                  Showing {first} to {first + discussions.length - 1} of {plural(total, "discussion", "discussions")}
                </PageNumbers>
              </>
            ) : query ? (
              <p className={`mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 ${note}`}>
                No discussions match "{query}". Try different words or another topic.
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className={`rounded font-[550] text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-ink ${focusRing}`}
                >
                  Clear search
                </button>
              </p>
            ) : (
              <p className={`mt-5 ${note}`}>
                {activeCategory === "all"
                  ? "No discussions yet. Be the first to start one."
                  : `No discussions in ${categoryLabel(activeCategory)} yet.`}
              </p>
            )}
          </div>
        </section>

        {/* On phones the button and the topic filter come first */}
        <aside className="min-w-0 max-lg:order-first lg:sticky lg:top-6 lg:self-start">
          {user && (
            <button
              ref={startButtonRef}
              type="button"
              onClick={() => setShowModal(true)}
              className={`w-full ${btnLg}`}
            >
              <Plus size={17} aria-hidden="true" /> Start a discussion
            </button>
          )}

          <div className="mt-9 max-lg:hidden">
            <SectionHead title="Topics" />
            <div role="group" aria-label="Filter by topic" className="divide-y divide-line">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveCategory(cat.value)}
                    className={`flex h-10 w-full items-center rounded text-left text-[14.5px] transition-colors ${focusRing} ${
                      active ? "font-semibold text-ink" : "font-medium text-ink-2 hover:text-ink"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 lg:hidden">
            <Chips label="Filter by topic" options={CATEGORIES} value={activeCategory} onChange={setActiveCategory} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Discussions;
