import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginApi } from "../../api/auth.api.js";
import useAuth from "../../hooks/useAuth.js";
import { Alert, focusRing } from "../../components/common/ui";
import AuthShell, { AuthField, AuthSubmit, authLink } from "./AuthShell";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const justActivated = location.state?.activated === true;
  // Set by the password change / reset flows.
  const notice = location.state?.notice;

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await loginApi(form);
      setUser(res.data.data);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      sub="Use your college email address."
      footer={
        <>
          First time here?{" "}
          <Link to="/signup" className={authLink}>
            Activate your account
          </Link>{" "}
          with the email on the college roster.
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {justActivated && !error && (
          <Alert kind="success">Account activated. Sign in with your new password.</Alert>
        )}
        {notice && !error && <Alert kind="success">{notice}</Alert>}
        {error && <Alert>{error}</Alert>}

        <AuthField
          id="login-email"
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="you@college.edu"
        />
        <AuthField
          id="login-password"
          label="Password"
          aside={
            <Link
              to="/forgot-password"
              className={`rounded text-[13.5px] text-ink-2 transition-colors hover:text-ink ${focusRing}`}
            >
              Forgot password?
            </Link>
          }
          type="password"
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <div className="pt-2">
          <AuthSubmit loading={loading} busyLabel="Signing in...">
            Sign in
          </AuthSubmit>
        </div>
      </form>
    </AuthShell>
  );
}
