import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resetPasswordApi } from "../../api/auth.api.js";
import { Alert } from "../../components/common/ui";
import AuthShell, { AuthField, AuthSubmit, authLink } from "./AuthShell";
import { readTokenFromHash, validatePasswordSetup } from "./passwordSetup";

// Same handling as VerifyEmail.jsx: the one-time token arrives in the URL
// FRAGMENT (/reset-password#token=...), which is never sent to any server. It
// is removed from the address bar and history immediately, kept only in
// component state, and sent once — in a POST body — with the new password.
export default function ResetPassword() {
  const navigate = useNavigate();
  const [token] = useState(readTokenFromHash);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", "/reset-password");
    }
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validatePasswordSetup(form.password, form.confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await resetPasswordApi({ token, password: form.password });
      navigate("/login", {
        replace: true,
        state: { notice: "Password reset. Sign in with your new password." },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      sub="You'll sign in with it on every device."
      footer={
        token && (
          <>
            Link expired?{" "}
            <Link to="/forgot-password" className={authLink}>
              Request a new one
            </Link>
          </>
        )
      }
    >
      {!token ? (
        <Alert>
          This reset link is incomplete. Open the link from your email again, or{" "}
          <Link to="/forgot-password" className="font-semibold underline underline-offset-[3px]">
            request a new one
          </Link>
          .
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert>{error}</Alert>}
          <AuthField
            id="reset-password"
            label="New password"
            type="password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            required
            placeholder="At least 8 characters"
          />
          <AuthField
            id="reset-confirm"
            label="Confirm new password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            placeholder="Repeat password"
          />
          <div className="pt-2">
            <AuthSubmit loading={loading} busyLabel="Saving...">
              Reset password
            </AuthSubmit>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
