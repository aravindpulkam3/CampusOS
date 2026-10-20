import { useState } from "react";
import { Link } from "react-router-dom";
import { signupApi } from "../../api/auth.api.js";
import { Alert } from "../../components/common/ui";
import AuthShell, { AuthField, AuthSent, AuthSubmit, authLink } from "./AuthShell";

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
    <AuthShell
      title="Activate your account"
      sub="Enter your college email. We'll send you a link to set your password."
      footer={
        <>
          Already activated?{" "}
          <Link to="/login" className={authLink}>
            Sign in
          </Link>
        </>
      }
    >
      {sentMessage ? (
        <AuthSent message={sentMessage}>
          The link expires in 24 hours. Didn't get it? Check your spam folder, or try again in a
          minute. If your email isn't recognised, contact your college administrator.
        </AuthSent>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert>{error}</Alert>}
          <AuthField
            id="signup-email"
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
              Send activation link
            </AuthSubmit>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
