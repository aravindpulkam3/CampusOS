import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const Forbidden = () => (
  <div className="min-h-screen flex items-center justify-center bg-white px-4">
    <div className="text-center max-w-sm">
      <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h1 className="text-xl font-semibold text-gray-900">Access denied</h1>
      <p className="mt-2 text-sm text-gray-500">
        You're not eligible to access this page. If you think this is a mistake, contact a superadmin.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
      >
        Back to dashboard
      </Link>
    </div>
  </div>
);

export default Forbidden;
