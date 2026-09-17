import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Megaphone, Trash2, Pin, Calendar, AlertTriangle } from "lucide-react";
import { getNotices, deleteNotice, togglePinNotice } from "../../api/notice.api";

const ManageNotices = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const { data } = await getNotices({ targetType: "platform" });
      setNotices(data.data.notices);
    } catch (err) {
      console.error("Failed to fetch platform notices", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    try {
      await deleteNotice(id);
      setNotices(notices.filter((n) => n._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePin = async (id) => {
    try {
      const { data } = await togglePinNotice(id);
      setNotices(
        notices.map((n) =>
          n._id === id ? { ...n, isPinned: data.data.isPinned } : n
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Notices</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage college-wide alerts and announcements.
          </p>
        </div>
        <Link
          to="/admin/notices/create"
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          Create Notice
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-100 rounded-xl">
          <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Megaphone size={24} />
          </div>
          <h3 className="text-sm font-medium text-gray-900">No platform notices</h3>
          <p className="text-xs text-gray-500 mt-1">
            Create a platform notice to broadcast messages to all users.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div
              key={notice._id}
              className={`p-4 bg-white border rounded-xl flex gap-4 ${
                notice.isPinned ? "border-amber-200 bg-amber-50/30" : "border-gray-200"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-semibold text-gray-900">
                    {notice.title}
                  </h3>
                  {notice.isPinned && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Pinned
                    </span>
                  )}
                  {notice.priority === "urgent" && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={10} /> Urgent
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">
                  {notice.content}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(notice.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span>By {notice.createdBy?.firstName} {notice.createdBy?.lastName}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handlePin(notice._id)}
                  className={`p-2 rounded-lg transition-colors ${
                    notice.isPinned
                      ? "text-amber-600 bg-amber-100 hover:bg-amber-200"
                      : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                  title={notice.isPinned ? "Unpin notice" : "Pin notice"}
                >
                  <Pin size={16} className={notice.isPinned ? "fill-current" : ""} />
                </button>
                <button
                  onClick={() => handleDelete(notice._id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete notice"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageNotices;
