import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { verifyEmailApi } from "../../api/auth.api.js";

// Reads the one-time activation token from the URL FRAGMENT
// (/verify-email#token=...). Fragments are never sent to any server, so the
// token stays out of hosting/CDN logs and Referer headers. It is removed from
// the address bar and history immediately, kept only in component state, and
// sent once — in a POST body — together with the new password.
const readTokenFromHash = () => {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get("token") || "";
};

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [token] = useState(readTokenFromHash);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", "/verify-email");
    }
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (new TextEncoder().encode(form.password).length > 72) {
      setError("Password must be at most 72 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await verifyEmailApi({ token, password: form.password });
      navigate("/login", { replace: true, state: { activated: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Activation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <span className="text-gray-900 text-xl font-semibold tracking-tight">EventSphere</span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Set your password</h2>
          <p className="text-sm text-gray-500">Choose a password to activate your account.</p>
        </div>

        {!token ? (
          <div className="px-4 py-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              This activation link is incomplete. Open the link from your email again, or{" "}
              <Link to="/signup" className="font-medium underline underline-offset-2">
                request a new one
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Min. 8 characters"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Repeat password"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 active:bg-gray-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Activating...
                  </>
                ) : (
                  "Activate account"
                )}
              </button>
            </form>

            <p className="mt-6 text-sm text-gray-500 text-center">
              Link expired?{" "}
              <Link to="/signup" className="text-gray-900 font-medium hover:underline underline-offset-2">
                Request a new one
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
