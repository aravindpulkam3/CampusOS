import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, Plus, ChevronRight } from "lucide-react";
import { getNotices, togglePinNotice, archiveNotice, deleteNotice } from "../../api/notice.api";
import NoticeCard from "./NoticeCard";
import useAuth from "../../hooks/useAuth";

const Skeleton = () => (
  <div className="space-y-2 animate-pulse p-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
        <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="w-2/3 h-3 bg-gray-200 rounded" />
          <div className="w-full h-2.5 bg-gray-100 rounded" />
        </div>
      </div>
    ))}
  </div>
);

const NoticeFeed = ({
  targetType,
  targetId,
  canPost     = false,
  showActions = false,
  title       = "Notices",
  compact     = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notices,    setNotices]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  const fetchNotices = useCallback(async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await getNotices({
        targetType,
        targetId: targetId || undefined,
        page,
        limit: compact ? 5 : 20,
      });
      setNotices(res.data.data.notices);
      setPagination(res.data.data.pagination);
    } catch {
      setError("Failed to load notices.");
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId, compact]);

  useEffect(() => { fetchNotices(1); }, [fetchNotices]);

  const handleRemove  = (id) => setNotices(p => p.filter(n => n._id !== id));
  const handlePin     = async (id) => { await togglePinNotice(id); };
  const handleArchive = async (id) => { if (!window.confirm("Archive?")) return; await archiveNotice(id); handleRemove(id); };
  const handleDelete  = async (id) => { if (!window.confirm("Delete permanently?")) return; await deleteNotice(id); handleRemove(id); };

  const urgentCount = notices.filter(n => n.priority === "urgent" || n.priority === "high").length;
  const createPath  = targetId ? `/${targetType}/${targetId}/notices/create` : `/platform/notices/create`;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* ── Header ── clean, minimal */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {urgentCount > 0
            ? <BellRing size={13} className="text-red-500" />
            : <Bell     size={13} className="text-gray-400" />}
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {!loading && notices.length > 0 && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              urgentCount > 0
                ? "bg-red-100 text-red-600"
                : "bg-gray-100 text-gray-500"
            }`}>
              {urgentCount > 0 ? `${urgentCount} alert${urgentCount > 1 ? "s" : ""}` : notices.length}
            </span>
          )}
        </div>

        {canPost && user && (
          <button
            onClick={() => navigate(createPath)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-2.5 py-1 rounded-lg transition-all"
          >
            <Plus size={11} /> Post
          </button>
        )}
      </div>

      {/* ── Body ── */}
      {loading ? (
        <Skeleton />
      ) : error ? (
        <p className="text-xs text-red-500 px-4 py-3">{error}</p>
      ) : notices.length > 0 ? (
        <>
          <div className="p-3 space-y-2">
            {notices.map((notice) => {
              const isOwner   = user?._id === (notice.createdBy?._id ?? notice.createdBy);
              const canManage = showActions && (isOwner || user?.role === "superadmin");
              return (
                <NoticeCard
                  key={notice._id}
                  notice={notice}
                  canManage={canManage}
                  onPin={handlePin}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>

          {!compact && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-gray-50">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchNotices(p)}
                  className={`w-6 h-6 text-[10px] font-semibold rounded-md border transition-all ${
                    p === pagination.page
                      ? "bg-gray-900 text-white border-gray-900"
                      : "text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {compact && pagination.pages > 1 && (
            <button
              onClick={() => navigate(`/${targetType}/${targetId ?? "platform"}/notices`)}
              className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-gray-400 hover:text-gray-700 border-t border-gray-50 transition-colors"
            >
              View all <ChevronRight size={11} />
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-10">
          <Bell size={18} className="text-gray-200" />
          <p className="text-xs text-gray-400">No notices yet</p>
          {canPost && user && (
            <button
              onClick={() => navigate(createPath)}
              className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 mt-1 transition-colors"
            >
              <Plus size={10} /> Post one
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NoticeFeed;