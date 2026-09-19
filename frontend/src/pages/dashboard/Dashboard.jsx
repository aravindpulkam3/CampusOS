import { useState, useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import { getDashboard } from "../../api/dashboard.api";

import TodaySchedule from "../../components/dashboard/TodaySchedule";
import RelevantNotices from "../../components/dashboard/RelevantNotices";
import DontMiss from "../../components/dashboard/DontMiss";
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
// student and returns render-ready DTOs — this component only lays them out.
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
    schedule = [],
    notices = [],
    dontMiss = [],
    deadlines = [],
    eligibleDrives = [],
  } = data || {};

  const classroomId = profile.classroomId;
  const dateLine = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto space-y-3 pb-10">
      <header className="py-1">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
          {getGreeting()}, {user?.firstName}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {dateLine}
          {profile.classroomLabel && (
            <span className="text-gray-400"> · {profile.classroomLabel}</span>
          )}
        </p>
      </header>

      {error && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-start">
        <div className="lg:col-span-3">
          <TodaySchedule schedule={schedule} classroomId={classroomId} />
        </div>
        <div className="lg:col-span-2">
          <RelevantNotices notices={notices} />
        </div>
      </div>

      <DontMiss items={dontMiss} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <UpcomingDeadlines deadlines={deadlines} classroomId={classroomId} />
        <EligibleDrives drives={eligibleDrives} profile={profile} />
      </div>

      <QuickAccess classroomId={classroomId} />
    </div>
  );
};

export default Dashboard;
