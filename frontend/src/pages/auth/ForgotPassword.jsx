import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordApi } from "../../api/auth.api.js";
import { Alert } from "../../components/common/ui";
import AuthShell, { AuthField, AuthSent, AuthSubmit, authLink } from "./AuthShell";

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
    <AuthShell
      title="Reset your password"
      sub="Enter your college email. We'll send you a link to choose a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className={authLink}>
            Sign in
          </Link>
        </>
      }
    >
      {sentMessage ? (
        <AuthSent message={sentMessage}>
          The link expires in 30 minutes. Didn't get it? Check your spam folder, or try again in a
          minute. If your email isn't recognised, contact your college administrator.
        </AuthSent>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert>{error}</Alert>}
          <AuthField
            id="forgot-email"
            label="College email address"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            required
            placeholder="you@college.edu"
          />
          <div className="pt-2">
            <AuthSubmit loading={loading} busyLabel="Sending link...">
              Send reset link
            </AuthSubmit>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
