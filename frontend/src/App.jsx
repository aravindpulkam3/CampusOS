import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Layout from "./components/layout/Layout";
import WorkspaceLayout from "./components/layout/WorkspaceLayout";
import ProtectedRoute from "./components/common/ProtectedRoute"; // 1. IMPORT YOUR GUARD COMPONENT

// Auth
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import VerifyEmail from "./pages/auth/VerifyEmail.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";

// Dashboard
import Dashboard from "./pages/dashboard/Dashboard";

// Community workspace
import Community from "./pages/Community.jsx";
import Clubs from "./pages/clubs/Clubs";
import ClubDetail from "./pages/clubs/ClubDetail";
import CreateClub from "./pages/clubs/CreateClub";
import Events from "./pages/events/Events.jsx";
import EventDetail from "./pages/events/EventDetail.jsx";
import EventForm from "./pages/events/EventForm.jsx";
import AnnouncementForm from "./pages/announcements/AnnouncementForm.jsx";

// Academics workspace
import Classroom from "./pages/academics/classroom/Classroom.jsx";
import Discussions from "./pages/discussions/Discussions.jsx";
import CompetitivePrep from "./pages/academics/competitive/CompetitivePrep.jsx";
import NoticeForm from "./components/forms/NoticeForm.jsx";

// Career workspace
import CareerDashboard from "./pages/career/CareerDashboard.jsx";
import DrivesList from "./pages/career/DrivesList.jsx";
import MyApplications from "./pages/career/MyApplications.jsx";
import DriveDetail from "./pages/career/DriveDetail.jsx";
import CreateDrive from "./pages/career/CreateDrive.jsx";

// Admin workspace
import ManageNotices from "./pages/admin/ManageNotices";
import ManageDrives from "./pages/admin/ManageDrives";
import ClassroomManagement from "./pages/admin/ClassroomManagement.jsx";
import CurriculumManagement from "./pages/admin/CurriculumManagement.jsx";
import RosterManagement from "./pages/admin/RosterManagement.jsx";

// Profile
import Profile from "./pages/profile/Profile";
import NotFound from "./pages/NotFound";
import CreateDeadline from "./pages/academics/classroom/CreateDeadline.jsx";
import DiscussionDetail from "./pages/discussions/DiscussionDetail.jsx";
import useAuth from "./hooks/useAuth.js";
import EditClub from "./pages/clubs/EditClub.jsx";

const adminTabs = [
  { label: "Drives", path: "/admin/drives", end: false },
  { label: "Notices", path: "/admin/notices", end: false },
  { label: "Classrooms", path: "/admin/classrooms", end: false },
  { label: "Curricula", path: "/admin/curricula", end: false },
  { label: "Roster", path: "/admin/roster", end: false },
];

function App() {
  const { loading } = useAuth();

  // Until the session check answers, nothing can decide which page to show.
  if (loading) {
    return (
      <div role="status" className="grid h-dvh w-screen place-items-center bg-white">
        <div className="size-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public — no layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* 3. WRAP THE MASTER LAYOUT ROUTE IN PROTECTEDROUTE */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* All nested internal routes are now automatically hidden behind login */}
          <Route path="/" element={<Dashboard />} />

          {/* Community workspace */}
          <Route path="/community" element={<Community />} />
          <Route path="/community/clubs" element={<Clubs />} />
          <Route path="/community/clubs/:clubId" element={<ClubDetail />} />
          <Route
            path="/community/clubs/create"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <CreateClub />
              </ProtectedRoute>
            }
          />
          <Route path="/community/clubs/:clubId/edit" element={<EditClub />} />
          <Route path="/community/events" element={<Events />} />
          <Route path="/community/events/:id" element={<EventDetail />} />
          <Route
            path="/community/clubs/:clubId/events/create"
            element={<EventForm mode="create" />}
          />
          <Route
            path="/community/events/:eventId/edit"
            element={<EventForm mode="edit" />}
          />
          <Route
            path="/community/:targetType/:targetId/announcements/create"
            element={<AnnouncementForm />}
          />
          {/* Announcements have no page of their own; they show in the community feed. */}
          <Route path="/community/announcements" element={<Navigate to="/community" replace />} />

          {/* Academics workspace */}
          <Route
            path="/academics/classroom/:classroomId"
            element={<Classroom />}
          />
          <Route path="/academics/competitive" element={<CompetitivePrep />} />
          <Route
            path="/:targetType/:targetId/create-notice"
            element={<NoticeForm />}
          />
          <Route
            path="/academics/:classroomId/deadline/form/:deadlineId?"
            element={<CreateDeadline />}
          />

          {/* Career workspace */}
          <Route path="/career" element={<CareerDashboard />} />
          <Route path="/career/drives" element={<DrivesList />} />
          <Route
            path="/career/drives/create"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "placementCoordinator"]}>
                <CreateDrive />
              </ProtectedRoute>
            }
          />
          <Route path="/career/drives/:id" element={<DriveDetail />} />
          <Route path="/career/my-applications" element={<MyApplications />} />

          {/* Discussions */}
          <Route path="/discussions" element={<Discussions />} />
          <Route path="/discussions/:id" element={<DiscussionDetail />} />

          {/* Admin workspace — Fine-grained specific role verification option */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <WorkspaceLayout tabs={adminTabs} />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/notices" replace />} />
            <Route path="drives" element={<ManageDrives />} />
            <Route path="notices" element={<ManageNotices />} />
            <Route path="classrooms" element={<ClassroomManagement />} />
            <Route path="curricula" element={<CurriculumManagement />} />
            <Route path="roster" element={<RosterManagement />} />
          </Route>
          
          <Route path="/admin/notices/create" element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <NoticeForm />
            </ProtectedRoute>
          } />

          {/* Profile — no tabs */}
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
