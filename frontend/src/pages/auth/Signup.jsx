import { useState } from "react";
import { Link } from "react-router-dom";
import { signupApi } from "../../api/auth.api.js";

// "Claim your account". Student accounts come from the college roster: the
// student only proves they own their roster email, and roll number, cohort and
// academic details are filled in from the roster. The server answers every
// address with the same message, so this page never learns (or reveals)
// whether an address is on the roster.
export default function Signup() {
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
      const res = await signupApi({ email: email.trim() });
      setSentMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[420px] shrink-0 bg-gray-950 flex-col justify-between p-14">
        <div>
          <span className="text-white text-xl font-semibold tracking-tight">EventSphere</span>
        </div>
        <div>
          <h1 className="text-white text-4xl font-light leading-tight mb-6">
            Join your<br />
            <span className="font-semibold">campus network.</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            Activate the account your college has set up for you to access events, placements,
            academic resources, and everything in between.
          </p>
        </div>
        <p className="text-gray-600 text-xs">© {new Date().getFullYear()} EventSphere</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <span className="text-gray-900 text-xl font-semibold tracking-tight">EventSphere</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Activate your account</h2>
            <p className="text-sm text-gray-500">
              Enter your college email. We'll send you a link to set your password.
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
                The link expires in 24 hours. Didn't get it? Check your spam folder, or try again in
                a minute. If your email isn't recognised, contact your college administrator.
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
                  "Send activation link"
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-gray-500 text-center">
            Already activated?{" "}
            <Link to="/login" className="text-gray-900 font-medium hover:underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
