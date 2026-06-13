import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Layout from "./components/layout/Layout";
import WorkspaceLayout from "./components/layout/WorkspaceLayout";
import ProtectedRoute from "./components/common/ProtectedRoute"; // 1. IMPORT YOUR GUARD COMPONENT

// Auth
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

// Dashboard
import Dashboard from "./pages/dashboard/Dashboard";

// Community workspace
import Community from "./pages/Community.jsx";
import Clubs from "./pages/clubs/Clubs";
import ClubDetail from "./pages/clubs/ClubDetail";
import CreateClub from "./pages/clubs/CreateClub";
import Events from "./pages/events/Events.jsx";
import EventDetail from "./pages/events/EventDetail.jsx";
import CreateEvent from "./pages/events/CreateEvent.jsx";
import MyEvents from "./pages/events/MyEvents.jsx";
import Announcements from "./pages/announcements/Announcements.jsx";
import AnnouncementForm from "./pages/announcements/AnnouncementForm.jsx";

// Academics workspace
import Classroom from "./pages/academics/classroom/Classroom.jsx";
import Discussions from "./pages/discussions/Discussions.jsx";
import CompetitivePrep from "./pages/academics/competitive/CompetitivePrep.jsx";
import SubjectDetail from "./pages/academics/classroom/SubjectDetail.jsx";
import NoticeForm from "./components/forms/NoticeForm.jsx";

// Career workspace
import CareerDashboard from "./pages/career/CareerDashboard.jsx";
import DrivesList from "./pages/career/DrivesList.jsx";
import MyApplications from "./pages/career/MyApplications.jsx";
import DriveDetail from "./pages/career/DriveDetail.jsx";
import CreateDrive from "./pages/career/CreateDrive.jsx"

// Admin workspace
import AdminPanel from "./pages/admin/AdminPanel";
import ManageClubs from "./pages/admin/ManageClubs";
import ManageDrives from "./pages/admin/ManageDrives";
import ModerationQueue from "./pages/admin/ModerationQueue";

// Profile
import Profile from "./pages/profile/Profile";
import NotFound from "./pages/NotFound";
import CreateDeadline from "./pages/academics/classroom/CreateDeadline.jsx";
import DiscussionDetail from "./pages/discussions/DiscussionDetail.jsx";
import useAuth from "./hooks/useAuth.js";



const adminTabs = [
  { label: "Clubs", path: "/admin", end: true },
  { label: "Drives", path: "/admin/drives", end: false },
  { label: "Moderation", path: "/admin/moderation", end: false },
  { label: "Notices", path: "/admin/notices", end: false },
];

function App() {
  const { loading } = useAuth(); // 2. FIXED: Added parenthesis to invoke hook properly

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-50">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    
      <BrowserRouter>
        <Routes>
          {/* Public — no layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

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
            <Route path="/community/clubs/create" element={<ProtectedRoute allowedRoles={["superadmin"]}><CreateClub /></ProtectedRoute>} />
            <Route path="/community/events" element={<Events />} />
            <Route path="/community/events/:id" element={<EventDetail />} />
            <Route path="/community/clubs/:clubId/events/create" element={
              <ProtectedRoute allowedRoles={["superadmin","clubadmin"]}><CreateEvent /> </ProtectedRoute>
              } />
            <Route path="/community/:targetType/:targetId/announcements/create" element={
              
              <AnnouncementForm />} />
            <Route path="/community/announcements" element={<Announcements />} />

            {/* Academics workspace */}
            <Route path="/academics/classroom/:classroomId" element={<Classroom />} />
            <Route path="/academics/competitive" element={<CompetitivePrep />} />
            <Route path="/academics/subjects/:name" element={<SubjectDetail />} />
            <Route path="/:targetType/:targetId/create-notice" element={<NoticeForm />} />
            <Route path="/academics/:classroomId/deadline/form/:deadlineId?" element={<CreateDeadline />} />

            {/* Career workspace */}
            <Route path="/career" element={<CareerDashboard />} />
            <Route path="/career/drives" element={<DrivesList />} />
            <Route path="/career/drives/create" element={<CreateDrive />} />
            <Route path="/career/drives/:id" element={<DriveDetail />} />
            <Route path="/career/my-applications" element={<MyApplications />} />

              {/* Discussions */}
            <Route path="/discussions" element={<Discussions />} />
            <Route path="/discussions/:id" element={<DiscussionDetail />} />

            {/* Admin workspace — Fine-grained specific role verification option */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={["superadmin", "placementCoordinator"]}>
                  <WorkspaceLayout tabs={adminTabs} />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminPanel />} />
              <Route path="drives" element={<ManageDrives />} />
              <Route path="moderation" element={<ModerationQueue />} />
              <Route path="notices" element={<ManageClubs />} />
            </Route>

            {/* Profile — no tabs */}
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    
  );
}

export default App;