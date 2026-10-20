import { useCallback, useEffect, useRef, useState } from "react";
import { getCommunityFeed } from "../api/announcement.api";
import { getPopularClubs } from "../api/club.api";
import { getUpcomingEvents } from "../api/event.api";
import useAuth from "../hooks/useAuth";
import useDebounce from "../hooks/useDebounce";
import AnnouncementCard from "./announcements/AnnouncementCard";
import NoticeFeed from "../components/cards/NoticeFeed";
import {
  Chips,
  LoadError,
  LoadMore,
  LogoTile,
  PageTitle,
  Row,
  Rows,
  SearchField,
  SectionHead,
  note,
} from "../components/common/ui";
import { EventRow } from "../components/events/eventBits";

const TYPES = [
  { value: "All", label: "All activity" },
  { value: "club", label: "Clubs" },
  { value: "event", label: "Events" },
];

const RowsSkeleton = () => (
  <div className="animate-pulse" aria-busy="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex h-16 items-center gap-4 border-t border-line first:border-t-0">
        <div className="size-10 flex-none rounded-[11px] bg-soft" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/2 rounded bg-soft" />
          <div className="h-3 w-1/3 rounded bg-soft" />
        </div>
      </div>
    ))}
  </div>
);

const Community = () => {
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [activeType, setActiveType] = useState("All");
  const [feedItems, setFeedItems] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [trendingClubs, setTrendingClubs] = useState([]);

  // Pagination States
  const [offsets, setOffsets] = useState({
    eventOffset: 0,
    clubOffset: 0,
    generalOffset: 0,
  });
  const [hasMore, setHasMore] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(true);
  const [widgetError, setWidgetError] = useState(false);
  const [widgetReload, setWidgetReload] = useState(0);
  const feedRequestRef = useRef(0);
  const searchRef = useRef(search);
  const userId = user?._id?.toString() ?? "";
  const followedClubsKey = user?.followedClubs
    ?.map((club) => String(club?._id ?? club)).sort().join(",") ?? "";
  const registeredEventsKey = user?.registeredEvents
    ?.map((event) => String(event?._id ?? event)).sort().join(",") ?? "";

  const resetFeed = () => {
    // Invalidate an in-flight page immediately, including during debounce.
    feedRequestRef.current += 1;
    setFeedItems([]);
    setOffsets({ eventOffset: 0, clubOffset: 0, generalOffset: 0 });
    setHasMore(false);
    setFeedLoading(true);
    setLoadMoreLoading(false);
    setFeedError(false);
  };

  // Core Request dynamic loader method
  const fetchFeed = useCallback(
    async (
      currentOffsets = { eventOffset: 0, clubOffset: 0, generalOffset: 0 },
      append = false,
    ) => {
      if (debouncedSearch !== searchRef.current) return;
      const request = ++feedRequestRef.current;
      try {
        setFeedError(false);
        if (append) setLoadMoreLoading(true);
        else setFeedLoading(true);

        const res = await getCommunityFeed(currentOffsets, {
          search: debouncedSearch.trim(),
          type: activeType,
        });
        if (request !== feedRequestRef.current) return;
        const {
          feed = [],
          hasMore: nextHasMore,
          offsets: nextOffsets,
        } = res?.data?.data || {};

        setFeedItems((prev) => (append ? [...prev, ...feed] : feed));
        setHasMore(nextHasMore);
        setOffsets(nextOffsets);
      } catch (err) {
        if (request === feedRequestRef.current) {
          console.error(err);
          setFeedError(true);
        }
      } finally {
        if (request === feedRequestRef.current) {
          setFeedLoading(false);
          setLoadMoreLoading(false);
        }
      }
    },
    [activeType, debouncedSearch],
  );

  useEffect(() => {
    let cancelled = false;
    const fetchWidgets = async () => {
      try {
        setWidgetLoading(true);
        setWidgetError(false);
        const [clubsRes, eventsRes] = await Promise.all([
          getPopularClubs(),
          getUpcomingEvents(),
        ]);
        if (cancelled) return;
        setTrendingClubs(clubsRes?.data?.data || []);
        setUpcomingEvents(eventsRes?.data?.data || []);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setWidgetError(true);
        }
      } finally {
        if (!cancelled) setWidgetLoading(false);
      }
    };

    fetchWidgets();
    return () => { cancelled = true; };
  }, [userId, followedClubsKey, widgetReload]);

  useEffect(() => {
    resetFeed();
    fetchFeed({ eventOffset: 0, clubOffset: 0, generalOffset: 0 }, false);
    return () => { feedRequestRef.current += 1; };
  }, [userId, followedClubsKey, registeredEventsKey, fetchFeed]);

  const handleLoadMore = () => {
    if (!loadMoreLoading && hasMore) {
      fetchFeed(offsets, true);
    }
  };

  const retryFeed = () => {
    const append = offsets.eventOffset + offsets.clubOffset + offsets.generalOffset > 0;
    fetchFeed(offsets, append);
  };

  const now = new Date();

  return (
    <div className="pb-10 lg:pb-20">
      <PageTitle title="Community" />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <Chips
          label="Show"
          options={TYPES}
          value={activeType}
          onChange={(type) => {
            if (type !== activeType) {
              resetFeed();
              setActiveType(type);
            }
          }}
        />
        <SearchField
          value={search}
          onChange={(value) => {
            searchRef.current = value;
            resetFeed();
            setSearch(value);
          }}
          label="Search community updates"
          placeholder="Search the feed"
        />
      </div>

      {/* Two columns from lg up. On phones the side column dissolves, so notices
          can come first and the events and clubs lists after the feed. */}
      <div className="mt-9 flex flex-col gap-y-11 lg:mt-14 lg:grid lg:grid-cols-[minmax(0,1fr)_352px] lg:items-start lg:gap-x-[72px]">
        <section className="order-2 min-w-0 lg:order-none">
          <SectionHead title="Latest activity" />
          {feedLoading ? (
            <RowsSkeleton />
          ) : feedError && feedItems.length === 0 ? (
            <LoadError onRetry={retryFeed}>Could not load community updates.</LoadError>
          ) : feedItems.length > 0 ? (
            <>
              <ul className="divide-y divide-line">
                {feedItems.map((item) => (
                  <AnnouncementCard key={item._id} announcement={item} variant="feed" />
                ))}
              </ul>
              {feedError && (
                <div className="mt-4">
                  <LoadError>Could not load more updates.</LoadError>
                </div>
              )}
              {hasMore && (
                <LoadMore onClick={feedError ? retryFeed : handleLoadMore} loading={loadMoreLoading} failed={feedError}>
                  Load more updates
                </LoadMore>
              )}
            </>
          ) : (
            <p className={note}>
              {search.trim()
                ? `No updates match "${search.trim()}".`
                : "Nothing here yet. Follow more clubs to see their updates."}
            </p>
          )}
        </section>

        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-14">
          <div className="order-1 min-w-0 lg:order-none">
            <NoticeFeed
              targetType="community"
              title="Notices"
              canPost={false}
              showActions={false}
            />
          </div>

          {widgetError ? (
            <div className="order-3 lg:order-none">
              <LoadError onRetry={() => setWidgetReload((value) => value + 1)}>
                Could not load upcoming events and popular clubs.
              </LoadError>
            </div>
          ) : (
            <>
              <section className="order-3 min-w-0 lg:order-none">
                <SectionHead title="Coming up" linkTo="/community/events" linkLabel="All events" />
                {widgetLoading ? (
                  <RowsSkeleton />
                ) : upcomingEvents.length > 0 ? (
                  <Rows>
                    {upcomingEvents.slice(0, 3).map((event) => (
                      <EventRow key={event._id} event={event} user={user} now={now} compact />
                    ))}
                  </Rows>
                ) : (
                  <p className={note}>No events are coming up right now.</p>
                )}
              </section>

              <section className="order-4 min-w-0 lg:order-none">
                <SectionHead title="Popular clubs" linkTo="/community/clubs" linkLabel="All clubs" />
                {widgetLoading ? (
                  <RowsSkeleton />
                ) : trendingClubs.length > 0 ? (
                  <Rows>
                    {trendingClubs.slice(0, 4).map((club) => (
                      <Row
                        key={club._id}
                        to={`/community/clubs/${club._id}`}
                        lead={<LogoTile src={club.logo} name={club.clubName} />}
                        title={club.clubName}
                        meta={`${club.followerCount || 0} ${club.followerCount === 1 ? "follower" : "followers"}`}
                      />
                    ))}
                  </Rows>
                ) : (
                  <p className={note}>No clubs yet.</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;
