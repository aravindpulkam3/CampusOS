import mongoose from "mongoose";

// One document per logged-in device. Invariant: a Session document exists
// if and only if that session is active — revoking a session means deleting
// it (logout, logout-all, refresh-token reuse, session cap). There is no
// "revoked" state to forget to check.
//
// _id is the `sid` claim of the refresh JWT. It is generated in memory before
// the token is signed, so the document is only ever written complete.
const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  // sha256 (hex) of the CURRENT refresh JWT. Never the token itself, so a
  // database leak does not yield usable refresh tokens.
  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: { type: Date, required: true }, // login time
  lastUsedAt: { type: Date, required: true }, // last successful rotation
  // ABSOLUTE end of the session, fixed at login and never extended by refresh.
  // The TTL index below deletes the document once it passes.
  expiresAt: { type: Date, required: true, immutable: true },
  userAgent: { type: String, default: "", maxlength: 200 },
});

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model("Session", sessionSchema);
export default Session;
