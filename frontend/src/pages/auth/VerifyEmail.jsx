import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { verifyEmailApi } from "../../api/auth.api.js";
import { Alert } from "../../components/common/ui";
import AuthShell, { AuthField, AuthSubmit, authLink } from "./AuthShell";
import { readTokenFromHash, validatePasswordSetup } from "./passwordSetup";

// Reads the one-time activation token from the URL FRAGMENT
// (/verify-email#token=...). Fragments are never sent to any server, so the
// token stays out of hosting/CDN logs and Referer headers. It is removed from
// the address bar and history immediately, kept only in component state, and
// sent once — in a POST body — together with the new password.
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
    const validationError = validatePasswordSetup(form.password, form.confirmPassword);
    if (validationError) {
      setError(validationError);
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

  return (
    <AuthShell
      title="Set your password"
      sub="Choose a password to activate your account."
      footer={
        token && (
          <>
            Link expired?{" "}
            <Link to="/signup" className={authLink}>
              Request a new one
            </Link>
          </>
        )
      }
    >
      {!token ? (
        <Alert>
          This activation link is incomplete. Open the link from your email again, or{" "}
          <Link to="/signup" className="font-semibold underline underline-offset-[3px]">
            request a new one
          </Link>
          .
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert>{error}</Alert>}
          <AuthField
            id="verify-password"
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            required
            placeholder="At least 8 characters"
          />
          <AuthField
            id="verify-confirm"
            label="Confirm password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            placeholder="Repeat password"
          />
          <div className="pt-2">
            <AuthSubmit loading={loading} busyLabel="Activating...">
              Activate account
            </AuthSubmit>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
