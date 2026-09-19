import mongoose from "mongoose";

// A pending "claim your account" link. One per email address (unique), so a
// new request replaces the old token. Only the sha256 of the token is stored;
// the raw token exists only in the emailed link. The document is deleted when
// the token is used (single use) or by the TTL index once expired.
const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  rosterEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RosterEntry",
    required: true,
  },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  // Per-address throttling of outgoing mail.
  lastSentAt: { type: Date, required: true },
  sendCount: { type: Number, default: 1 }, // emails sent in the current window
  windowStartedAt: { type: Date, required: true },
});

emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailVerification = mongoose.model("EmailVerification", emailVerificationSchema);
export default EmailVerification;
