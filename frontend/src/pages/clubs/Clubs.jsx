import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, X, Users, Plus } from "lucide-react";
import { getAllClubs, followClub, unfollowClub } from "../../api/club.api";
import useAuth from "../../hooks/useAuth";

// ✅ Included Sports category cleanly in definition array
const CATEGORIES = [
  "All",
  "Technical",
  "Cultural",
  "Creative",
  "Business",
  "Sports",
];

// ✅ Configured unique matching layout theme for Sports cards
const categoryColor = {
  Technical: "bg-blue-50 text-blue-700 border-blue-100",
  Cultural: "bg-purple-50 text-purple-700 border-purple-100",
  Creative: "bg-orange-50 text-orange-700 border-orange-100",
  Business: "bg-green-50 text-green-700 border-green-100",
  Sports: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const clubBg = [
  "bg-slate-900",
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-rose-600",
];

const clubInitials = (name) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

// ─── Club Card ────────────────────────────────────────────────
const ClubCard = ({ club, index, followed, pending, onFollow }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-slate-300 hover:shadow-xs transition-all duration-200 flex flex-col gap-4 group relative overflow-hidden shadow-3xs">
      {/* Top row — avatar + category */}
      <div className="flex items-start justify-between gap-2">
        <div
          className={`w-12 h-12 rounded-xl ${clubBg[index % clubBg.length]} flex items-center justify-center text-white text-base font-black flex-shrink-0 overflow-hidden border border-black/5 transition-transform group-hover:scale-102`}
        >
          {club.logo ? (
            <img
              src={club.logo}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            clubInitials(club.clubName)
          )}
        </div>
        {club.category && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-wide whitespace-nowrap ${categoryColor[club.category] || "bg-slate-50 text-slate-600"}`}
          >
            {club.category}
          </span>
        )}
      </div>

      {/* Club info */}
      <div className="flex-1 space-y-1">
        <h3 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-1">
          {club.clubName}
        </h3>
        <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">
          {club.description || "No description available."}
        </p>
      </div>

      {/* Followers count */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <Users size={12} className="text-slate-300" />
        <span>{club.followerCount ?? 0} active followers</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
        <button
          type="button"
          onClick={() => onFollow(club._id, followed)}
          disabled={pending}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all duration-150 shadow-3xs disabled:opacity-60 disabled:cursor-wait
            ${
              followed
                ? "border-slate-200 text-slate-400 bg-slate-50 hover:border-red-200 hover:text-red-500 hover:bg-red-50/30"
                : "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
            }`}
        >
          {followed ? "Following" : "Follow"}
        </button>
        <Link
          to={`/community/clubs/${club._id}`}
          className="flex-1 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:text-slate-900 transition-all text-center shadow-3xs"
        >
          View Hub
        </Link>
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────
const EmptyState = ({ search, category }) => (
  <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-100 rounded-2xl shadow-3xs">
    <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-3 shadow-3xs">
      <Users size={16} className="text-slate-400" />
    </div>
    <p className="text-sm font-bold text-slate-700 mb-0.5">No matching clubs</p>
    <p className="text-xs text-slate-400 font-medium">
      {search
        ? `No results for "${search}"`
        : `No ${category !== "All" ? category : ""} hubs found active yet.`}
    </p>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────
const Clubs = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const { user, setUser } = useAuth();
  // Clubs with a follow/unfollow request in flight: their button stays
  // disabled until it settles, so responses can't arrive out of order.
  const [pendingIds, setPendingIds] = useState(() => new Set());

  useEffect(() => {
    const fetchAllClubs = async () => {
      try {
        const payload = await getAllClubs();
        setClubs(payload.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllClubs();
  }, []);

  const handleFollow = async (clubId, followed) => {
    if (pendingIds.has(clubId)) return;
    setPendingIds((prev) => new Set(prev).add(clubId));
    try {
      const payload = await (followed ? unfollowClub : followClub)(clubId);
      setClubs((prev) =>
        prev.map((c) => (c._id === clubId ? payload.data.data.club : c)),
      );
      setUser(payload.data.data.user);
    } catch (error) {
      console.error(error);
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(clubId);
        return next;
      });
    }
  };

  const filtered = clubs.filter((club) => {
    const matchesCategory =
      activeCategory === "All" || club.category === activeCategory;
    const matchesSearch =
      !search ||
      club.clubName?.toLowerCase().includes(search.toLowerCase()) ||
      club.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Campus Organizations
          </h2>
          <p className="text-xs font-semibold text-slate-800 mt-0.5">
            {loading
              ? "Synchronizing registry..."
              : `${clubs.length} registered clubs online`}
          </p>
        </div>
        {user?.role === "superadmin" && (
          <Link
            to="/community/clubs/create"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-3xs whitespace-nowrap"
          >
            <Plus size={13} /> Create Organization
          </Link>
        )}
      </div>

      {/* Search + Filter Action Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-100 p-3 rounded-2xl shadow-3xs">
        <div className="relative w-full md:w-72">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search operational hubs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-slate-300 placeholder:text-slate-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border whitespace-nowrap transition-all duration-150 shadow-3xs
                ${
                  activeCategory === cat
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-800"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Club Responsive Layout Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse space-y-4 shadow-3xs"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                <div className="w-16 h-5 bg-slate-100 rounded-md" />
              </div>
              <div className="space-y-2">
                <div className="w-32 h-4 bg-slate-100 rounded" />
                <div className="w-full h-3 bg-slate-50 rounded" />
                <div className="w-3/4 h-3 bg-slate-50 rounded" />
              </div>
              <div className="w-24 h-3 bg-slate-100 rounded pt-1" />
              <div className="h-8 bg-slate-100 rounded-xl pt-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length > 0 ? (
            filtered.map((club, i) => (
              <ClubCard
                key={club._id}
                club={club}
                index={i}
                followed={
                  user?.followedClubs?.some(
                    (id) => id.toString() === club._id.toString(),
                  ) ?? false
                }
                pending={pendingIds.has(club._id)}
                onFollow={handleFollow}
              />
            ))
          ) : (
            <EmptyState search={search} category={activeCategory} />
          )}
        </div>
      )}
    </div>
  );
};

export default Clubs;
