import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Pin, Plus } from "lucide-react";
import { listPlatformNotices, deleteNotice, togglePinNotice } from "../../api/notice.api";
import { PRIORITY_LABEL } from "../../components/cards/NoticeCard";
import {
  Alert,
  Kicker,
  LoadError,
  PageTitle,
  Pager,
  btn,
  btnDangerSm,
  btnGhostSm,
  feedTitle,
  note,
} from "../../components/common/ui";
import { formatDate, formatDateTime } from "../../utils/formatDate";

// The same marks the notice feeds use, so a notice looks here the way it will there.
const kickerTone = { urgent: "urgent", high: "warn" };

const ManageNotices = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0 });
  const [reload, setReload] = useState(0);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchNotices = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const { data } = await listPlatformNotices(page);
        if (cancelled) return;
        setNotices(data.data.notices);
        setPagination(data.data.pagination);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch platform notices", err);
        setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchNotices();
    return () => { cancelled = true; };
  }, [page, reload]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this notice? It disappears for everyone.")) return;
    setActionError("");
    try {
      await deleteNotice(id);
      if (notices.length === 1 && page > 1) setPage(page - 1);
      else setReload((value) => value + 1);
    } catch (err) {
      console.error(err);
      setActionError("Couldn't delete the notice. Try again.");
    }
  };

  const handlePin = async (id) => {
    setActionError("");
    try {
      await togglePinNotice(id);
      setReload((value) => value + 1);
    } catch (err) {
      console.error(err);
      setActionError("Couldn't change the pin. Try again.");
    }
  };

  return (
    <div className="pb-10 lg:pb-20">
      <PageTitle crumb="Admin" title="Platform notices" sub="College-wide alerts that every user sees.">
        <Link to="/admin/notices/create" className={btn}>
          <Plus size={15} aria-hidden="true" /> New notice
        </Link>
      </PageTitle>

      {actionError && (
        <div className="mt-6">
          <Alert>{actionError}</Alert>
        </div>
      )}

      {loading ? (
        <div className="mt-8 animate-pulse space-y-6" aria-busy="true">
          <span className="sr-only">Loading notices</span>
          {[62, 78, 54].map((w) => (
            <div key={w} className="space-y-2">
              <div className="h-3 w-40 rounded bg-soft" />
              <div className="h-4 rounded bg-soft" style={{ width: `${w}%` }} />
              <div className="h-3 w-full rounded bg-soft" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="mt-8">
          <LoadError onRetry={() => setReload((value) => value + 1)}>Couldn't load platform notices.</LoadError>
        </div>
      ) : notices.length === 0 ? (
        <p className={`mt-8 ${note}`}>No platform notices. New ones reach every user, on every page that lists notices.</p>
      ) : (
        <>
        <h2 className="sr-only">Notices</h2>
        <ul className="mt-6 divide-y divide-line">
          {notices.map((notice) => (
            <li key={notice._id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:gap-6">
              <div className="min-w-0 flex-1">
                <Kicker tone={kickerTone[notice.priority] || "quiet"} pinned={notice.isPinned}>
                  {[
                    PRIORITY_LABEL[notice.priority],
                    formatDate(notice.createdAt),
                    notice.createdBy && `by ${notice.createdBy.firstName} ${notice.createdBy.lastName}`,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Kicker>
                <h3 className={feedTitle} title={formatDateTime(notice.createdAt)}>
                  {notice.title}
                </h3>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[14.5px] leading-[1.55] text-ink-2">
                  {notice.content}
                </p>
              </div>
              <div className="flex flex-none gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePin(notice._id)}
                  aria-pressed={notice.isPinned}
                  aria-label={`${notice.isPinned ? "Unpin" : "Pin"}: ${notice.title}`}
                  className={btnGhostSm}
                >
                  <Pin size={13} className={notice.isPinned ? "fill-current" : ""} aria-hidden="true" />
                  {notice.isPinned ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(notice._id)}
                  aria-label={`Delete: ${notice.title}`}
                  className={btnDangerSm}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        </>
      )}
      {pagination.pages > 1 && (
        <Pager page={page} pages={pagination.pages} onPage={setPage}>
          {pagination.total} {pagination.total === 1 ? "notice" : "notices"}
        </Pager>
      )}
    </div>
  );
};

export default ManageNotices;
