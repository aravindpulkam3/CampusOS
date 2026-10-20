import { useState, useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { getDashboard } from "../../api/dashboard.api";
import { getUpcomingEvents } from "../../api/event.api";
import { btnSm, focusRing } from "../../components/common/ui";

import TodaySchedule from "../../components/dashboard/TodaySchedule";
import Attention from "../../components/dashboard/Attention";
import CampusEvents from "../../components/dashboard/CampusEvents";
import UpcomingDeadlines from "../../components/dashboard/UpcomingDeadlines";
import EligibleDrives from "../../components/dashboard/EligibleDrives";
import DashboardSkeleton from "../../components/dashboard/DashboardSkeleton";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// One loading state. The backend decides what is relevant to this student and
// returns render-ready DTOs; this component only lays them out. Campus events
// are the one section that is the same for everyone, so they come from the
// events API alongside, and the page still renders if that request fails.
const Dashboard = () => {
  const { user } = useAuth();
  useDocumentTitle("Home");

  const [data, setData] = useState(null);
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    (async () => {
      const [dashboard, upcoming] = await Promise.allSettled([getDashboard(), getUpcomingEvents()]);
      if (cancelled) return;

      if (dashboard.status === "fulfilled") {
        setData(dashboard.value.data.data);
      } else {
        console.error(dashboard.reason);
        setFailed(true);
      }
      setEvents(upcoming.status === "fulfilled" ? upcoming.value.data.data || [] : null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (loading) return <DashboardSkeleton />;

  const {
    profile = {},
    schedule = [],
    notices = [],
    dontMiss = [],
    deadlines = [],
    eligibleDrives = [],
  } = data || {};

  const classroomId = profile.classroomId;
  // The first upcoming event gets the large block, closing time included, so it
  // is not repeated in the attention feed.
  const closing = dontMiss.filter((item) => item.id !== `event-${events?.[0]?._id}`);
  const dateLine = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="pb-10 pt-1 lg:pb-20 lg:pt-6">
      <header>
        <p className="text-[14.5px] text-ink-3">
          {dateLine}
          {profile.classroomLabel && <> · {profile.classroomLabel}</>}
        </p>
        <h1 className="mt-1 break-words text-[29px] font-[680] leading-[1.12] tracking-[-0.042em] text-ink lg:text-4xl lg:leading-[1.12]">
          {getGreeting()}, {user?.firstName}
        </h1>
      </header>

      {failed ? (
        <div role="alert" className="mt-8 rounded-panel border border-line-2 bg-white/[0.78] px-6 py-5">
          <p className="text-[15px] font-semibold text-ink">Your dashboard didn't load.</p>
          <p className="mt-0.5 text-[13.5px] text-ink-2">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className={`mt-4 ${btnSm} ${focusRing} focus-visible:ring-offset-2`}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <TodaySchedule schedule={schedule} classroomId={classroomId} />

          {/* One grid for everything below the day. On phones the attention feed moves above the events. */}
          <div className="mt-11 grid grid-cols-1 gap-y-11 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-x-[72px] lg:gap-y-16">
            <CampusEvents events={events} />
            <div className="min-w-0 max-lg:order-first">
              <Attention notices={notices} closing={closing} />
            </div>
            <EligibleDrives
              drives={eligibleDrives}
              profile={profile}
              shownAbove={new Set(closing.map((item) => item.id))}
            />
            <UpcomingDeadlines deadlines={deadlines} classroomId={classroomId} />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
