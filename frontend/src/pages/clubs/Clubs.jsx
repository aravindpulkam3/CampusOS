import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { getAllClubs, followClub, unfollowClub } from "../../api/club.api";
import useAuth from "../../hooks/useAuth";
import useImageOk from "../../hooks/useImageOk";
import { CLUB_CATEGORIES } from "../../constants/categories";
import {
  Chips,
  LoadError,
  LogoTile,
  PageTitle,
  SearchField,
  btn,
  btnGhostSm,
  btnSm,
  focusRing,
  note,
} from "../../components/common/ui";

// "Following" narrows to the student's own clubs; the rest are club categories.
const FILTERS = ["All", "Following", ...CLUB_CATEGORIES];

const clubInitials = (name) =>
  name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

// The club's banner. Without one, its logo or initials on a quiet block.
const Banner = ({ club }) => {
  const [showBanner, onBannerError] = useImageOk(club.banner);
  const [showLogo, onLogoError] = useImageOk(club.logo);
  if (showBanner)
    return (
      <img
        src={club.banner}
        alt=""
        loading="lazy"
        onError={onBannerError}
        className="aspect-[2/1] w-full rounded-2xl object-cover"
      />
    );
  return (
    <div
      aria-hidden="true"
      className="grid aspect-[2/1] w-full place-items-center rounded-2xl bg-soft ring-1 ring-inset ring-line"
    >
      {showLogo ? (
        <img src={club.logo} alt="" onError={onLogoError} className="h-16 max-w-[40%] object-contain" />
      ) : (
        <span className="text-[44px] font-[680] tracking-[-0.04em] text-ink/15">
          {clubInitials(club.clubName)}
        </span>
      )}
    </div>
  );
};

// The whole card opens the club; Follow sits above that link as its own target.
const ClubCard = ({ club, followed, pending, onFollow }) => (
  <li className="group relative min-w-0">
    <Banner club={club} />
    <div className="mt-4 flex items-center gap-3">
      <LogoTile src={club.logo} name={club.clubName} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[17.5px] font-[650] leading-tight tracking-[-0.028em] text-ink">
          <Link
            to={`/community/clubs/${club._id}`}
            className={`rounded decoration-ink/25 underline-offset-4 after:absolute after:inset-0 group-hover:underline ${focusRing}`}
          >
            {club.clubName}
          </Link>
        </h3>
        <p className="truncate text-[13.5px] text-ink-3">
          {club.category}
          {club.isActive === false && ", pending approval"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onFollow(club._id, followed)}
        disabled={pending}
        aria-pressed={followed}
        className={`relative z-10 flex-none ${followed ? btnGhostSm : btnSm}`}
      >
        {followed ? "Following" : "Follow"}
      </button>
    </div>
    <p className="mt-3 line-clamp-2 text-[14.5px] leading-normal text-ink-2">
      {club.description || "No description yet."}
    </p>
    <p className="mt-2.5 text-[13.5px] text-ink-3">
      {club.followerCount ?? 0} {club.followerCount === 1 ? "follower" : "followers"}
    </p>
  </li>
);

const CardSkeleton = () => (
  <div className="animate-pulse">
    <div className="aspect-[2/1] rounded-2xl bg-soft" />
    <div className="mt-4 flex items-center gap-3">
      <div className="size-10 rounded-[11px] bg-soft" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded bg-soft" />
        <div className="h-3 w-1/4 rounded bg-soft" />
      </div>
    </div>
    <div className="mt-4 h-3 w-full rounded bg-soft" />
    <div className="mt-2 h-3 w-2/3 rounded bg-soft" />
  </div>
);

const Clubs = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const { user, setUser } = useAuth();
  // Clubs with a follow/unfollow request in flight: their button stays
  // disabled until it settles, so responses can't arrive out of order.
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const fetchAllClubs = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const payload = await getAllClubs();
      setClubs(payload.data.data || []);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllClubs(); }, [fetchAllClubs]);

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

  const isFollowed = (club) =>
    user?.followedClubs?.some((id) => String(id?._id ?? id) === String(club._id)) ?? false;

  const term = search.trim().toLowerCase();
  const filtered = clubs.filter((club) => {
    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Following" ? isFollowed(club) : club.category === activeFilter);
    const matchesSearch =
      !term ||
      club.clubName?.toLowerCase().includes(term) ||
      club.description?.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="pb-10 lg:pb-20">
      <PageTitle title="Clubs">
        {user?.role === "superadmin" && (
          <Link to="/community/clubs/create" className={btn}>
            <Plus size={15} aria-hidden="true" /> Create club
          </Link>
        )}
      </PageTitle>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <Chips label="Filter clubs" options={FILTERS} value={activeFilter} onChange={setActiveFilter} />
        <SearchField value={search} onChange={setSearch} label="Search clubs" placeholder="Search clubs" />
      </div>

      {loading ? (
        <div className="mt-11 grid grid-cols-1 gap-x-7 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-12" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : loadError ? (
        <div className="mt-9">
          <LoadError onRetry={fetchAllClubs}>Could not load clubs.</LoadError>
        </div>
      ) : filtered.length > 0 ? (
        <>
        <h2 className="sr-only">All clubs</h2>
        <ul className="mt-11 grid grid-cols-1 gap-x-7 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-12">
          {filtered.map((club) => (
            <ClubCard
              key={club._id}
              club={club}
              followed={isFollowed(club)}
              pending={pendingIds.has(club._id)}
              onFollow={handleFollow}
            />
          ))}
        </ul>
        </>
      ) : (
        <p className={`mt-9 ${note}`}>
          {term
            ? `No clubs match "${search.trim()}".`
            : activeFilter === "Following"
              ? "You are not following any clubs yet."
              : activeFilter === "All"
                ? "There are no clubs yet."
                : `There are no ${activeFilter.toLowerCase()} clubs yet.`}
        </p>
      )}
    </div>
  );
};

export default Clubs;
