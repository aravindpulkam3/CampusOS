import { useState, useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import { getDashboard } from "../../api/dashboard.api";

import ImportantToday from "../../components/dashboard/ImportantToday";
import TodaySchedule from "../../components/dashboard/TodaySchedule";
import RelevantNotices from "../../components/dashboard/RelevantNotices";
import UpcomingDeadlines from "../../components/dashboard/UpcomingDeadlines";
import EligibleDrives from "../../components/dashboard/EligibleDrives";
import QuickAccess from "../../components/dashboard/QuickAccess";
import DashboardSkeleton from "../../components/dashboard/DashboardSkeleton";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// One request, one loading state. The backend decides what is relevant to this
// student and returns render-ready DTOs — this component only lays them out,
// and deliberately does no filtering, sorting, date maths or eligibility logic.
const Dashboard = () => {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getDashboard();
        if (!cancelled) setData(res.data.data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Failed to load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <DashboardSkeleton />;

  const {
    profile = {},
    actionRequired = [],
    schedule = [],
    notices = [],
    deadlines = [],
    eligibleDrives = [],
  } = data || {};

  const classroomId = profile.classroomId;

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-10">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Greeting ── */}
      <div className="bg-white border border-gray-100 rounded-2xl px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {getGreeting()}, {user?.firstName} 👋
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 tracking-tight">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
        </div>
      </div>

      {/* ── Top billing: what needs noticing today, actionable or not ── */}
      <ImportantToday items={actionRequired} />

      {/* ── What's happening / what you missed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <TodaySchedule schedule={schedule} classroomId={classroomId} />
        </div>
        <div className="lg:col-span-2">
          <RelevantNotices notices={notices} />
        </div>
      </div>

      {/* ── What's coming ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingDeadlines deadlines={deadlines} classroomId={classroomId} />
        <EligibleDrives drives={eligibleDrives} profile={profile} />
      </div>


      <QuickAccess classroomId={classroomId} />
    </div>
  );
};

export default Dashboard;
