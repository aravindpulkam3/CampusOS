import mongoose from "mongoose";

// A pending "reset your password" link: at most one per user (a new request
// replaces it). Only the sha256 of the token is stored; the raw token exists
// only in the emailed link. Single use: the document is deleted when the token
// is used. Expiry is checked when the token is used — the TTL index only
// cleans up documents that were never used.
const passwordResetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);
export default PasswordReset;
