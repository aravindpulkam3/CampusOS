import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordApi } from "../../api/auth.api.js";

// The server answers every address with the same message, so this page never
// learns (or reveals) whether an account exists.
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your college email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await forgotPasswordApi({ email: email.trim() });
      setSentMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <span className="text-gray-900 text-xl font-semibold tracking-tight">EventSphere</span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Reset your password</h2>
          <p className="text-sm text-gray-500">
            Enter your college email. We'll send you a link to choose a new password.
          </p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {sentMessage ? (
          <div className="px-4 py-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <p className="text-sm text-gray-900">{sentMessage}</p>
            <p className="text-xs text-gray-500">
              The link expires in 30 minutes. Didn't get it? Check your spam folder, or try again
              in a minute. If your email isn't recognised, contact your college administrator.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                College email address
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                required
                placeholder="you@college.edu"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
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
                  Sending link...
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-gray-500 text-center">
          Remembered it?{" "}
          <Link to="/login" className="text-gray-900 font-medium hover:underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
