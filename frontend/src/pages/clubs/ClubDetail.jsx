import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Bell, BellOff, Pencil, Plus } from "lucide-react";
import {
  followClub,
  unfollowClub,
  getClubDetails,
  muteClub,
  unmuteClub,
} from "../../api/club.api";
import {
  getAnnouncements,
  deleteAnnouncement,
} from "../../api/announcement.api";
import useAuth from "../../hooks/useAuth";
import useIsClamped from "../../hooks/useIsClamped";
import useImageOk from "../../hooks/useImageOk";
import {
  LoadError,
  LoadMore,
  LogoTile,
  PageMessage,
  PageTitle,
  Rows,
  SectionHead,
  btn,
  btnGhost,
  btnGhostSm,
  crumbLink,
  focusRing,
  note,
  tone,
} from "../../components/common/ui";
import { EventRow } from "../../components/events/eventBits";
import NoticeFeed from "../../components/cards/NoticeFeed";
import AnnouncementCard from "../announcements/AnnouncementCard";

// Ids arrive either bare or populated.
const idOf = (x) => String(x?._id ?? x);

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const Skeleton = () => (
  <div className="animate-pulse pb-10" aria-busy="true" aria-label="Loading club">
    <div className="flex items-center gap-4 pt-1 lg:pt-4">
      <div className="size-[60px] flex-none rounded-2xl bg-soft" />
      <div className="flex-1">
        <div className="h-4 w-32 rounded bg-soft" />
        <div className="mt-3 h-9 w-1/2 rounded-lg bg-soft" />
      </div>
    </div>
    <div className="mt-14 space-y-3">
      <div className="h-4 w-full max-w-xl rounded bg-soft" />
      <div className="h-4 w-full max-w-lg rounded bg-soft" />
      <div className="h-4 w-full max-w-md rounded bg-soft" />
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────
const ClubDetail = () => {
  const { clubId } = useParams();
  const { user, setUser } = useAuth();

  const [club, setClub] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [pastEventCount, setPastEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // "notFound" | "failed"
  const [reloadKey, setReloadKey] = useState(0);
  const [followPending, setFollowPending] = useState(false);
  const [mutePending, setMutePending] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);

  // Announcements page through their own endpoint, 10 at a time.
  const [announcements, setAnnouncements] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const activeClubRef = useRef(clubId);

  const [showClubBanner, onClubBannerError] = useImageOk(club?.banner);

  const descriptionRef = useRef(null);
  const descriptionClamped = useIsClamped(
    descriptionRef,
    !aboutExpanded,
    club?.description,
  );

  // Fetched per club only: follow/mute update the user in context, and the
  // page derives its state from that instead of refetching.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setAboutExpanded(false);
    getClubDetails(clubId)
      .then((payload) => {
        if (cancelled) return;
        const data = payload.data.data;
        setClub(data.club);
        setIsAdmin(data.isAdmin);
        setUpcomingEvents(data.upcomingEvents || []);
        setPastEvents(data.pastEvents || []);
        setPastEventCount(data.pastEventCount ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        const status = err.response?.status;
        setLoadError(status === 404 || status === 400 ? "notFound" : "failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, reloadKey]);

  const fetchAnnouncements = useCallback(
    async (fromOffset, append) => {
      const requestedClub = clubId;
      if (append) setLoadMoreLoading(true);
      else setFeedLoading(true);
      setFeedError(false);
      try {
        const res = await getAnnouncements("club", clubId, fromOffset);
        if (activeClubRef.current !== requestedClub) return;
        const { announcements: page = [], hasMore: more, nextOffset } =
          res?.data?.data || {};
        setAnnouncements((prev) => (append ? [...prev, ...page] : page));
        setHasMore(more);
        setOffset(nextOffset);
      } catch (err) {
        if (activeClubRef.current !== requestedClub) return;
        console.error("Failed to load announcements:", err);
        setFeedError(true);
      } finally {
        if (activeClubRef.current === requestedClub) {
          setFeedLoading(false);
          setLoadMoreLoading(false);
        }
      }
    },
    [clubId],
  );

  useEffect(() => {
    activeClubRef.current = clubId;
    setAnnouncements([]);
    setHasMore(false);
    fetchAnnouncements(0, false);
  }, [clubId, fetchAnnouncements]);

  // Derived from the user in context, which the follow/mute handlers update.
  const isFollowing = !!user?.followedClubs?.some((id) => idOf(id) === clubId);
  const isMuted = !!user?.mutedClubs?.some((id) => idOf(id) === clubId);

  // Each control sends the desired state and stays disabled until its request
  // settles, so an older response can never land after a newer one.
  const handleFollowButton = async () => {
    if (followPending) return;
    setFollowPending(true);
    try {
      const payload = await (isFollowing ? unfollowClub : followClub)(clubId);
      const { club: updated, user: updatedUser } = payload.data.data;
      // The response's club is unpopulated; keep ours and take the new count.
      setClub((prev) => ({ ...prev, followerCount: updated.followerCount }));
      setUser(updatedUser);
    } catch (error) {
      console.error(error);
    } finally {
      setFollowPending(false);
    }
  };

  const handleMuteButton = async () => {
    if (mutePending) return;
    setMutePending(true);
    try {
      const payload = await (isMuted ? unmuteClub : muteClub)(clubId);
      const nowMuted = payload.data.data.isMuted;
      setUser((prev) => {
        const others = (prev.mutedClubs || []).filter((id) => id.toString() !== clubId);
        return { ...prev, mutedClubs: nowMuted ? [...others, clubId] : others };
      });
    } catch (error) {
      console.error(error);
    } finally {
      setMutePending(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
      // Everything after it shifted up one; keep the next page from skipping an item.
      setOffset((o) => Math.max(0, o - 1));
    } catch (error) {
      console.error(error);
    }
  };

  const handleLoadMore = () => {
    if (!loadMoreLoading && hasMore) fetchAnnouncements(offset, true);
  };

  if (loading) return <Skeleton />;
  if (loadError || !club)
    return loadError === "failed" ? (
      <PageMessage
        title="Couldn't load this club"
        action={
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={btnGhost}>
            Try again
          </button>
        }
      >
        Check your connection and try again.
      </PageMessage>
    ) : (
      <PageMessage
        title="Club not found"
        action={
          <Link to="/community/clubs" className={btnGhost}>
            Back to clubs
          </Link>
        }
      >
        It may have been removed, or the link is incorrect.
      </PageMessage>
    );

  const coreTeam = club.clubAdmins || [];
  const isCoreMember = !!user && coreTeam.some((m) => idOf(m) === String(user._id));
  const now = new Date();
  const shownTeam = coreTeam.slice(0, 6);
  const hiddenTeamCount = coreTeam.length - shownTeam.length;

  return (
    <div className="pb-10 lg:pb-20">
      {showClubBanner && (
        <img
          src={club.banner}
          alt=""
          onError={onClubBannerError}
          className="mb-5 mt-1 aspect-[16/8] w-full rounded-[18px] object-cover shadow-[0_1px_2px_rgb(14_15_17/0.06),0_36px_60px_-36px_rgb(14_15_17/0.5)] lg:aspect-[21/6] lg:rounded-3xl"
        />
      )}

      <PageTitle
        lead={<LogoTile src={club.logo} name={club.clubName} size="lg" />}
        crumb={
          <>
            <Link to="/community/clubs" className={crumbLink}>
              Clubs
            </Link>
            {club.category && ` / ${club.category}`}
          </>
        }
        title={club.clubName}
      >
        {isFollowing && (
          <button
            type="button"
            onClick={handleMuteButton}
            disabled={mutePending}
            aria-label={isMuted ? "Unmute notifications from this club" : "Mute notifications from this club"}
            title={isMuted ? "Unmute notifications" : "Mute notifications"}
            className={`grid size-[38px] flex-none place-items-center rounded-[11px] border border-line-2 bg-white transition-colors hover:border-ink-3 disabled:cursor-wait disabled:opacity-60 ${
              isMuted ? "text-ink-3" : "text-ink"
            } ${focusRing} focus-visible:ring-offset-2`}
          >
            {isMuted ? <BellOff size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />}
          </button>
        )}
        <button
          type="button"
          onClick={handleFollowButton}
          disabled={followPending}
          aria-pressed={isFollowing}
          className={`group/follow min-w-[104px] ${isFollowing ? btnGhost : btn}`}
        >
          {isFollowing ? (
            <>
              <span className="group-hover/follow:hidden group-focus-visible/follow:hidden">Following</span>
              <span className="hidden group-hover/follow:inline group-focus-visible/follow:inline">Unfollow</span>
            </>
          ) : (
            "Follow"
          )}
        </button>
      </PageTitle>

      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[14.5px] text-ink-2">
        <span>{plural(club.followerCount ?? 0, "follower", "followers")}</span>
        <span>{plural(coreTeam.length, "core member", "core members")}</span>
        {isCoreMember && <span className={tone.live}>You're on the core team</span>}
        {!club.isActive && <span className={tone.warn}>Pending approval</span>}
      </p>

      {isAdmin && (
        <nav aria-label="Manage club" className="mt-5 flex flex-wrap items-center gap-2">
          <Link to={`/clubs/${clubId}/create-notice`} className={btnGhostSm}>
            <Plus size={14} aria-hidden="true" /> Post notice
          </Link>
          <Link to={`/community/club/${clubId}/announcements/create`} className={btnGhostSm}>
            <Plus size={14} aria-hidden="true" /> Post announcement
          </Link>
          <Link to={`/community/clubs/${clubId}/events/create`} className={btnGhostSm}>
            <Plus size={14} aria-hidden="true" /> Create event
          </Link>
          <Link to={`/community/clubs/${clubId}/edit`} state={{ club, isAdmin }} className={btnGhostSm}>
            <Pencil size={13} aria-hidden="true" /> Edit club
          </Link>
        </nav>
      )}

      <div className="mt-9 grid grid-cols-1 gap-y-11 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-x-[72px]">
        <div className="min-w-0 space-y-11 lg:space-y-14">
          <section aria-labelledby="club-about">
            <SectionHead id="club-about" title="About" />
            {club.description ? (
              <>
                <p
                  ref={descriptionRef}
                  className={`max-w-[62ch] break-words text-[15.5px] leading-[1.65] text-ink/90 ${
                    aboutExpanded ? "whitespace-pre-line" : "line-clamp-4"
                  }`}
                >
                  {club.description}
                </p>
                {(descriptionClamped || aboutExpanded) && (
                  <button
                    type="button"
                    onClick={() => setAboutExpanded((v) => !v)}
                    aria-expanded={aboutExpanded}
                    className={`mt-2 rounded text-[13.5px] font-[550] text-ink-2 transition-colors hover:text-ink ${focusRing}`}
                  >
                    {aboutExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </>
            ) : (
              <p className={note}>No description yet.</p>
            )}
          </section>

          {/* Notices can be urgent, so they sit above events and announcements. */}
          <NoticeFeed
            targetType="clubs"
            targetId={clubId}
            title="Noticeboard"
            canPost={isAdmin}
            showActions={isAdmin}
          />

          <section aria-labelledby="club-events" className="min-w-0">
            <SectionHead id="club-events" title="Events" />
            {upcomingEvents.length > 0 ? (
              <Rows>
                {upcomingEvents.map((event) => (
                  <EventRow key={event._id} event={event} user={user} now={now} registration />
                ))}
              </Rows>
            ) : (
              <p className={note}>No upcoming events.</p>
            )}

            {pastEvents.length > 0 && (
              <>
                <p className="mt-7 flex items-baseline border-t border-line pt-5 text-[13.5px] text-ink-3">
                  <span className="font-[550]">Past</span>
                  {pastEventCount > pastEvents.length && (
                    <span className="ml-auto">
                      Latest {pastEvents.length} of {pastEventCount}
                    </span>
                  )}
                </p>
                <Rows>
                  {pastEvents.map((event) => (
                    <EventRow key={event._id} event={event} user={user} now={now} past />
                  ))}
                </Rows>
              </>
            )}
          </section>

          <section aria-labelledby="club-announcements" className="min-w-0">
            <SectionHead id="club-announcements" title="Announcements" />
            {feedLoading && announcements.length === 0 ? (
              <div className="animate-pulse space-y-3 py-1.5" aria-busy="true">
                <div className="h-4 w-1/3 rounded bg-soft" />
                <div className="h-4 w-2/3 rounded bg-soft" />
              </div>
            ) : announcements.length > 0 ? (
              <>
                <ul className="divide-y divide-line">
                  {announcements.map((a) => (
                    <AnnouncementCard
                      key={a._id}
                      announcement={a}
                      variant="detail"
                      isEligible={isAdmin}
                      onDelete={handleDeleteAnnouncement}
                    />
                  ))}
                </ul>
                {feedError && (
                  <div className="mt-4">
                    <LoadError>Couldn't load more announcements.</LoadError>
                  </div>
                )}
                {hasMore && (
                  <LoadMore onClick={handleLoadMore} loading={loadMoreLoading} failed={feedError} />
                )}
              </>
            ) : feedError ? (
              <LoadError onRetry={() => fetchAnnouncements(0, false)}>
                Couldn't load announcements.
              </LoadError>
            ) : (
              <p className={note}>No announcements yet.</p>
            )}
          </section>
        </div>

        <aside className="min-w-0">
          <section aria-labelledby="club-team">
            <SectionHead id="club-team" title="Core team" />
            {coreTeam.length > 0 ? (
              <>
                <ul className="space-y-3 pt-1.5">
                  {shownTeam.map((member) => (
                    <li key={idOf(member)} className="flex min-w-0 items-center gap-3">
                      <LogoTile src={member.profilePicture} name={member.firstName} size="sm" cover />
                      <span className="truncate text-[14.5px] font-medium text-ink">
                        {member.firstName} {member.lastName}
                      </span>
                    </li>
                  ))}
                </ul>
                {hiddenTeamCount > 0 && (
                  <p className="mt-3 text-[13.5px] text-ink-3">+{hiddenTeamCount} more</p>
                )}
              </>
            ) : (
              <p className={note}>No core members listed yet.</p>
            )}
          </section>

          {club.createdAt && (
            <p className="mt-9 border-t border-line pt-5 text-[13.5px] text-ink-3">
              Created{" "}
              {new Date(club.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ClubDetail;
