import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-white px-4">
    <div className="text-center max-w-sm">
      <SearchX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        This page doesn't exist or has been moved.
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

export default NotFound;
