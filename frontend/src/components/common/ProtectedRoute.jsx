import { Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";
import Forbidden from "../../pages/Forbidden.jsx";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div role="status" className="grid min-h-screen place-items-center bg-white">
        <div className="size-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Forbidden />;
  }

  return children;
};

export default ProtectedRoute;