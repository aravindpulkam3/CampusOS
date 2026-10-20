import { useEffect, useState, useCallback, useId, useRef } from "react";
import {
  getNotices,
  togglePinNotice,
  archiveNotice,
  deleteNotice,
} from "../../api/notice.api";
import NoticeCard from "./NoticeCard";
import useAuth from "../../hooks/useAuth";
import { LoadError, SectionHead, note } from "../common/ui";

const Skeleton = () => (
  <div role="status" className="animate-pulse space-y-5 py-1.5">
    <span className="sr-only">Loading notices</span>
    {[62, 78].map((w) => (
      <div key={w} className="space-y-2">
        <div className="h-3 w-24 rounded bg-soft" />
        <div className="h-3.5 rounded bg-soft" style={{ width: `${w}%` }} />
        <div className="h-3 w-full rounded bg-soft" />
      </div>
    ))}
  </div>
);

// The notice section every page shares: a heading, then the notices as a quiet
// feed, urgent ones first. It has no width of its own, so the same component
// serves a full page column, a side column and a phone.
const NoticeFeed = ({
  targetType,
  targetId,
  canPost = false,
  showActions = false,
  title = "Notices",
  postTo, // where "Post notice" goes; shown only when canPost is also true
}) => {
  const { user } = useAuth();
  const headingId = useId();
  const headingRef = useRef(null);

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getNotices({
        targetType,
        targetId: targetId || undefined,
      });
      // Backend now naturally returns a max of 5 unexpired notices sorted by priority
      setNotices(res.data.data.notices);
    } catch {
      setError("Couldn't load notices.");
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // The row that had focus is gone, so park focus on the section heading.
  const handleRemove = (id) => {
    setNotices((p) => p.filter((n) => n._id !== id));
    headingRef.current?.focus();
  };
  const handlePin = async (id) => {
    await togglePinNotice(id);
  };
  const handleArchive = async (id) => {
    if (!window.confirm("Archive?")) return;
    await archiveNotice(id);
    handleRemove(id);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete permanently?")) return;
    await deleteNotice(id);
    handleRemove(id);
  };

  // Urgent notices lead; within each group the backend's order (pinned first)
  // is kept as it came. Nothing is dropped and nothing else is re-sorted.
  const ordered = [
    ...notices.filter((n) => n.priority === "urgent"),
    ...notices.filter((n) => n.priority !== "urgent"),
  ];

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <SectionHead
        id={headingId}
        headingRef={headingRef}
        title={title}
        linkTo={canPost && postTo ? postTo : undefined}
        linkLabel="Post notice"
      />

      {loading ? (
        <Skeleton />
      ) : error ? (
        <LoadError onRetry={fetchNotices}>{error}</LoadError>
      ) : notices.length > 0 ? (
        <ul className="divide-y divide-line">
          {ordered.map((notice) => {
            // createdBy is usually populated, but may be a bare id.
            const creatorId = notice.createdBy?._id ?? notice.createdBy;
            const isOwner = !!user && String(creatorId) === String(user._id);
            const canManage = showActions && (isOwner || user?.role === "superadmin");
            return (
              <NoticeCard
                key={notice._id}
                notice={notice}
                canManage={canManage}
                showSource={!targetId}
                onPin={handlePin}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            );
          })}
        </ul>
      ) : (
        <p className={note}>No notices yet. New ones will show up here.</p>
      )}
    </section>
  );
};

export default NoticeFeed;
