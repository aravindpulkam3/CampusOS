import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import Session from "../models/Session.js";
import RosterEntry from "../models/RosterEntry.js";
import EmailVerification from "../models/EmailVerification.js";
import PasswordReset from "../models/PasswordReset.js";
import {
  sendAccountClaimEmail,
  sendPasswordResetEmail,
} from "../utils/mailer.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/generateToken.js";
import Classroom from "../models/Classroom.js";
import Discussion from "../models/Discussion.js";
import Application from "../models/Application.js";
import { findClassroomForUser } from "./classroom.service.js";
import ApiError from "../utils/apiError.js";
import { withTransaction } from "../utils/transaction.js";
import { env } from "../config/env.js";
import { getIO } from "../sockets/socketHandler.js";

// ─── sessions ─────────────────────────────────────────────────────────────────
// Per-device sessions (models/Session.js). A session lives at most
// SESSION_MAX_AGE from login, no matter how often it refreshes; within that,
// each refresh token is valid for at most JWT_REFRESH_EXPIRY (idle timeout).
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, absolute
const MAX_SESSIONS_PER_USER = 10;

// ─── cookies ──────────────────────────────────────────────────────────────────
// Frontend and API must be on the same site: SameSite=Strict is the CSRF
// defence, so it must never be relaxed to None. The refresh cookie is scoped to
// /api/auth so it is only ever sent to the auth routes that use it.
const REFRESH_COOKIE_PATH = "/api/auth";
const BASE_COOKIE = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "strict",
};
const ACCESS_COOKIE = { ...BASE_COOKIE, path: "/" };
const REFRESH_COOKIE = { ...BASE_COOKIE, path: REFRESH_COOKIE_PATH };
// Before sessions, the refresh cookie lived at path "/". Clearing it keeps an
// old browser from carrying a dead token around until it expires.
const LEGACY_REFRESH_COOKIE = { ...BASE_COOKIE, path: "/" };

export const setAuthCookies = (res, { accessToken, refresh }) => {
  res
    .cookie("accessToken", accessToken, {
      ...ACCESS_COOKIE,
      maxAge: env.jwt.accessExpirySec * 1000,
    })
    .cookie("refreshToken", refresh.token, {
      ...REFRESH_COOKIE,
      maxAge: refresh.maxAgeMs, // the token's own remaining lifetime
    })
    .clearCookie("refreshToken", LEGACY_REFRESH_COOKIE);
};

// Each cookie is cleared with the same attributes it was set with.
export const clearAuthCookies = (res) => {
  res
    .clearCookie("accessToken", ACCESS_COOKIE)
    .clearCookie("refreshToken", REFRESH_COOKIE)
    .clearCookie("refreshToken", LEGACY_REFRESH_COOKIE);
};

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

// Issues a refresh token for a session, capped by the session's ABSOLUTE
// expiry: refreshing can never extend a session past expiresAt. Returns null
// once the session has no lifetime left.
const issueRefresh = (userId, sid, expiresAt, now) => {
  const remainingSec = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
  if (remainingSec <= 0) return null;
  const ttlSec = Math.min(env.jwt.refreshExpirySec, remainingSec);
  const token = generateRefreshToken(userId, sid, ttlSec);
  return { token, tokenHash: sha256(token), maxAgeMs: ttlSec * 1000 };
};

// Keeps only the newest MAX_SESSIONS_PER_USER sessions, so repeated logins
// cannot grow session storage without bound.
const enforceSessionCap = async (userId) => {
  const excess = await Session.find({ user: userId })
    .sort({ lastUsedAt: -1 })
    .skip(MAX_SESSIONS_PER_USER)
    .select("_id")
    .lean();
  if (excess.length > 0) {
    await Session.deleteMany({ _id: { $in: excess.map((s) => s._id) } });
  }
};

// The sid is generated in memory and the token signed and hashed BEFORE the
// single write, so a Session document is never persisted half-built.
const createSession = async (userId, userAgent) => {
  const now = new Date();
  const sid = new mongoose.Types.ObjectId();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS);
  const refresh = issueRefresh(userId, sid, expiresAt, now);

  await Session.create({
    _id: sid,
    user: userId,
    tokenHash: refresh.tokenHash,
    createdAt: now,
    lastUsedAt: now,
    expiresAt,
    userAgent: typeof userAgent === "string" ? userAgent.slice(0, 200) : "",
  });
  await enforceSessionCap(userId);

  return { accessToken: generateAccessToken(userId), refresh };
};

// ─── account claim (signup) ───────────────────────────────────────────────────
// A student account can only be created by claiming a RosterEntry through its
// email. Identity (roll number, cohort) and academic data come from the
// roster, never from the client, so nobody can register as someone else or
// pick their own classroom.
const CLAIM_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // link validity
const CLAIM_RESEND_INTERVAL_MS = 60 * 1000; // at most 1 email per minute...
const CLAIM_MAX_SENDS_PER_DAY = 5; // ...and 5 per day, per address
const DAY_MS = 24 * 60 * 60 * 1000;

// The roster-owned fields a User carries. batch is immutable on User, so it is
// only ever set when the account is created.
const rosterIdentity = (entry) => ({
  firstName: entry.firstName,
  lastName: entry.lastName,
  email: entry.email,
  rollNumber: entry.rollNumber,
  branch: entry.branch,
  batch: entry.batch,
  section: entry.section,
  year: entry.year,
  cgpa: entry.cgpa,
  backlogs: entry.backlogs,
});

// Step 1 of signup. Always resolves without revealing anything: the caller
// answers every request with the same generic message, whether or not the
// address is on the roster or already has an account. `email` must be a
// string (checked by the controller).
export const requestAccountClaim = async (email) => {
  const normalized = email.trim().toLowerCase();
  const entry = await RosterEntry.findOne({ email: normalized }).lean();
  if (!entry) return;

  if (entry.claimedBy) {
    const linked = await User.findById(entry.claimedBy)
      .select("emailVerifiedAt")
      .lean();
    if (linked?.emailVerifiedAt) return; // already active — nothing to claim
  }

  const now = new Date();
  const existing = await EmailVerification.findOne({
    email: normalized,
  }).lean();
  let sendCount = 1;
  let windowStartedAt = now;
  if (existing) {
    if (now - existing.lastSentAt < CLAIM_RESEND_INTERVAL_MS) return;
    if (now - existing.windowStartedAt < DAY_MS) {
      if (existing.sendCount >= CLAIM_MAX_SENDS_PER_DAY) return;
      sendCount = existing.sendCount + 1;
      windowStartedAt = existing.windowStartedAt;
    }
  }

  // Replaces any previous token: only the newest link for an address works.
  const token = crypto.randomBytes(32).toString("base64url");
  const update = {
    $set: {
      rosterEntry: entry._id,
      tokenHash: sha256(token),
      expiresAt: new Date(now.getTime() + CLAIM_TOKEN_TTL_MS),
      lastSentAt: now,
      sendCount,
      windowStartedAt,
    },
  };
  try {
    // Conditional on the state read above, so two concurrent requests cannot
    // both pass the throttle: the loser matches nothing (or hits the unique
    // email index on insert) and sends no email.
    const written = existing
      ? await EmailVerification.findOneAndUpdate(
          { _id: existing._id, lastSentAt: existing.lastSentAt },
          update,
        )
      : await EmailVerification.findOneAndUpdate(
          { email: normalized },
          update,
          {
            upsert: true,
          },
        );
    if (existing && !written) return;
  } catch (err) {
    if (err.code === 11000) return;
    throw err;
  }

  // Not awaited: response timing must not reveal roster membership, and a
  // mail failure must not either. The user can request a new link after the
  // resend interval.
  sendAccountClaimEmail(normalized, token).catch((err) =>
    console.error(`[MAIL] account claim email failed: ${err.message}`),
  );
};

// The one password rule, shared by activation, password change and reset.
// bcrypt only reads the first 72 bytes, so longer is refused rather than
// silently truncated. `owner` is the account's roster identity.
const validateNewPassword = (password, owner) => {
  if (typeof password !== "string") {
    throw new ApiError(400, "Password is required.");
  }
  const bytes = Buffer.byteLength(password, "utf8");
  if (bytes < 8 || bytes > 72) {
    throw new ApiError(400, "Password must be 8 to 72 characters.");
  }
  const identity = [owner.email, owner.email?.split("@")[0], owner.rollNumber]
    .filter(Boolean)
    .map((value) => value.toLowerCase());
  if (identity.includes(password.toLowerCase())) {
    throw new ApiError(
      400,
      "Your password can't be your email or roll number.",
    );
  }
};

// Step 2 of signup: the emailed token proves the caller owns the roster
// email. `token` must be a string (checked by the controller); the password
// is checked here, against the roster identity it belongs to.
//
// One transaction: consuming the token, claiming the roster entry and
// creating (or activating) the user succeed or fail together. If any step
// fails, nothing is saved — the link stays usable until it expires.
export const verifyAccountClaim = (token, password) =>
  withTransaction(async (session) => {
    const now = new Date();

    // Consume the token first, atomically: only one request can ever get it.
    const verification = await EmailVerification.findOneAndDelete(
      { tokenHash: sha256(token), expiresAt: { $gt: now } },
      { session },
    ).lean();
    if (!verification) {
      throw new ApiError(
        400,
        "This link is invalid or has expired. Request a new one.",
      );
    }

    const entry = await RosterEntry.findById(verification.rosterEntry)
      .session(session)
      .lean();
    // The roster email may have changed since the link was sent.
    if (!entry || entry.email !== verification.email) {
      throw new ApiError(
        400,
        "This link is no longer valid. Request a new one.",
      );
    }
    // A rejected password aborts the transaction, so the link stays usable.
    validateNewPassword(password, entry);

    // PASSWORDS: always assign on a User document and save(), so the pre("save")
    // bcrypt hook hashes it. Never updateOne / findByIdAndUpdate / $set a
    // password — those bypass the hook and would store plaintext.

    if (entry.claimedBy) {
      // Legacy account, linked to this entry by the migration and never verified.
      const user = await User.findById(entry.claimedBy)
        .select("+password")
        .session(session);
      if (!user) {
        throw new ApiError(
          409,
          "This roster entry is linked to a missing account. Contact an administrator.",
        );
      }
      if (user.emailVerifiedAt) {
        throw new ApiError(
          409,
          "This account is already active. Sign in instead.",
        );
      }
      user.password = password;
      user.emailVerifiedAt = now;
      // Re-sync roster-owned data. Cohort (branch/batch/section) already matches:
      // the migration links only when it does.
      user.firstName = entry.firstName;
      user.lastName = entry.lastName;
      user.year = entry.year;
      user.cgpa = entry.cgpa;
      user.backlogs = entry.backlogs;
      if (!user.classroom) {
        const classroom = await findClassroomForUser(entry, session);
        if (classroom) user.classroom = classroom._id;
      }
      await user.save({ session });
      return user;
    }

    // New account: claim the entry (conditional on claimedBy: null, so two
    // requests can never both create an account for it), then create the user.
    // The id is generated inside the callback: withTransaction may run it again
    // after a transient error.
    const newUserId = new mongoose.Types.ObjectId();
    const claimed = await RosterEntry.findOneAndUpdate(
      { _id: entry._id, claimedBy: null },
      { $set: { claimedBy: newUserId } },
      { session },
    );
    if (!claimed) {
      throw new ApiError(
        409,
        "This account has already been activated. Sign in instead.",
      );
    }

    const user = new User({
      _id: newUserId,
      ...rosterIdentity(entry),
      password,
      // Consuming the emailed token IS the verification.
      emailVerifiedAt: now,
    });
    // A Classroom must already exist (admin-created) for this cohort; no match
    // leaves the student unassigned until an admin creates it (which backfills).
    const classroom = await findClassroomForUser(entry, session);
    if (classroom) user.classroom = classroom._id;
    await user.save({ session });
    return user;
  });

// Callers must pass strings: an operator object such as {"$regex": "."} would
// otherwise reach the query (the controller rejects non-strings with 400).
export const loginUser = async (email, password, userAgent) => {
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    "+password",
  );

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password.");
  }

  // Checked only after a correct password, so it reveals nothing to guessers.
  if (!user.emailVerifiedAt) {
    throw new ApiError(
      403,
      "Your account is not activated yet. Use Sign up with your college email to receive an activation link.",
    );
  }

  const { accessToken, refresh } = await createSession(user._id, userAgent);

  // Strip sensitive fields before returning
  const userObj = user.toObject();
  delete userObj.password;

  return { user: userObj, accessToken, refresh };
};

// Strict rotation: only the session's CURRENT refresh token is accepted, and
// it is replaced atomically (one findOneAndUpdate matching on its hash).
//
// A validly signed token that is no longer current means the token was used
// twice — stolen and replayed, or raced — so the whole session is revoked.
//
// INTENTIONAL FAILURE MODE — not a bug, do not "fix" by loosening the match:
// if the server rotates but the response never reaches the browser (network
// drop, tab closed mid-request), the browser still holds the old token, its
// next refresh is treated as reuse, and the user must log in again. This is
// the accepted cost of strict rotation with no grace window; any grace window
// would reopen a replay window for stolen tokens. The frontend serializes
// refreshes across tabs (Web Locks, api/axios.js) so legitimate clients never
// present the same token twice.
export const refreshSession = async (incomingRefreshToken) => {
  if (typeof incomingRefreshToken !== "string" || !incomingRefreshToken) {
    throw new ApiError(401, "No refresh token.");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRefreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  const { id: userId, sid } = decoded;
  // Tokens issued before per-device sessions carry no sid.
  if (!mongoose.isValidObjectId(sid) || !mongoose.isValidObjectId(userId)) {
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const now = new Date();
  // expiresAt is immutable, so reading it before the atomic update is safe.
  const session = await Session.findOne({ _id: sid, user: userId })
    .select("expiresAt")
    .lean();
  if (!session) {
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const refresh = issueRefresh(userId, sid, session.expiresAt, now);
  if (!refresh) {
    await Session.deleteOne({ _id: sid });
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const rotated = await Session.findOneAndUpdate(
    {
      _id: sid,
      user: userId,
      tokenHash: sha256(incomingRefreshToken),
      expiresAt: { $gt: now },
    },
    // Never touches expiresAt: refreshing must not extend the session.
    { $set: { tokenHash: refresh.tokenHash, lastUsedAt: now } },
    { new: true, projection: { _id: 1 } },
  );

  if (!rotated) {
    // The session exists but this token is not its current one: reuse.
    const { deletedCount } = await Session.deleteOne({
      _id: sid,
      user: userId,
    });
    if (deletedCount > 0) {
      console.warn(
        `[SECURITY] refresh token reuse: user=${userId} sid=${sid} — session revoked`,
      );
    }
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  if (!(await User.exists({ _id: userId }))) {
    await Session.deleteOne({ _id: sid });
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  return { accessToken: generateAccessToken(userId), refresh };
};

// Ends the session the refresh cookie belongs to. Works with an expired
// access token, and with an expired-but-genuine refresh token (signature still
// verified). Matching on tokenHash too means a stale token cannot log out
// someone else's live session. Never throws: logout always succeeds for the
// caller, and the controller clears the cookies regardless.
export const logoutSession = async (incomingRefreshToken) => {
  if (typeof incomingRefreshToken !== "string" || !incomingRefreshToken) return;

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRefreshToken, {
      ignoreExpiration: true,
    });
  } catch {
    return;
  }
  if (!mongoose.isValidObjectId(decoded.sid)) return;

  await Session.deleteOne({
    _id: decoded.sid,
    tokenHash: sha256(incomingRefreshToken),
  });
};

export const logoutAllSessions = async (userId) => {
  await Session.deleteMany({ user: userId });
  // Drop live sockets too; their reconnect needs a refresh, which now fails.
  getIO()?.in(`user:${userId}`).disconnectSockets(true);
};

// ─── password change / reset ──────────────────────────────────────────────────
// Both write the new password and delete EVERY refresh session in one
// transaction, so no session opened with the old password survives.
//
// Other devices are NOT logged out instantly: an access token they already hold
// stays valid until it expires (JWT_ACCESS_EXPIRY, 15 min by default). Their
// next refresh fails, and then they must sign in again. That is the accepted
// trade-off of stateless access tokens.
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

// The caller is logged in; only the current password authorizes a new one.
// This device's session is revoked with the others (the controller clears its
// cookies), so every device signs in again with the new password.
export const changeUserPassword = async (
  userId,
  currentPassword,
  newPassword,
) => {
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    throw new ApiError(400, "Enter your current and new password.");
  }
  const user = await User.findById(userId).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  // 400, not 401: a 401 would make the frontend refresh the token and retry.
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, "Current password is incorrect.");
  }
  validateNewPassword(newPassword, user);
  if (await user.comparePassword(newPassword)) {
    throw new ApiError(
      400,
      "Choose a password different from your current one.",
    );
  }

  await withTransaction(async (session) => {
    user.password = newPassword; // hashed by the pre("save") hook
    await user.save({ session });
    await Session.deleteMany({ user: user._id }, { session });
  });
  getIO()?.in(`user:${user._id}`).disconnectSockets(true);
};

// Always resolves without revealing anything: the controller answers every
// request with the same message. Only an existing, activated account gets a
// link. `email` must be a string (checked by the controller).
export const requestPasswordReset = async (email) => {
  const normalized = email.trim().toLowerCase();
  const user = await User.findOne({
    email: normalized,
    emailVerifiedAt: { $ne: null },
  })
    .select("_id email")
    .lean();
  if (!user) return;

  const token = crypto.randomBytes(32).toString("base64url");
  try {
    // One document per user: a new request replaces the previous link.
    await PasswordReset.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    // A concurrent request inserted first; its link stands.
    if (err.code === 11000) return;
    throw err;
  }

  // Not awaited: a mail failure must not change the response.
  sendPasswordResetEmail(user.email, token).catch((err) =>
    console.error(`[MAIL] password reset email failed: ${err.message}`),
  );
};

// One transaction: using the token, writing the new password and revoking
// every refresh session succeed or fail together — a rejected password rolls
// back, so the link stays usable until it expires. `token` must be a string
// (checked by the controller).
export const resetUserPassword = async (token, newPassword) => {
  const invalidLink = () =>
    new ApiError(
      400,
      "This link is invalid or has expired. Request a new one.",
    );

  const userId = await withTransaction(async (session) => {
    const reset = await PasswordReset.findOneAndDelete(
      { tokenHash: sha256(token), expiresAt: { $gt: new Date() } },
      { session },
    ).lean();
    if (!reset) throw invalidLink();

    const user = await User.findById(reset.user)
      .select("+password")
      .session(session);
    if (!user?.emailVerifiedAt) throw invalidLink();

    validateNewPassword(newPassword, user);
    user.password = newPassword; // hashed by the pre("save") hook
    await user.save({ session });
    await Session.deleteMany({ user: user._id }, { session });
    return user._id;
  });
  getIO()?.in(`user:${userId}`).disconnectSockets(true);
};

export const getProfileData = async (userId) => {
  // Fetch user first (needed for classroom & populated arrays)
  const user = await User.findById(userId)
    .select(
      "firstName lastName email rollNumber branch year section cgpa backlogs batch role profilePicture createdAt classroom followedClubs registeredEvents",
    )
    .populate("followedClubs", "clubName logo")
    .populate("registeredEvents", "eventName venue startDateTime")
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Run independent queries in parallel
  const [
    classroom,
    discussionsCreated,
    placementApplications,
    recentApplications,
  ] = await Promise.all([
    user.classroom
      ? Classroom.findById(user.classroom).select("branch batch section").lean()
      : null,

    Discussion.countDocuments({ author: userId }),

    Application.countDocuments({ student: userId }),

    Application.find({ student: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("drive", "companyName role status deadline")
      .lean(),
  ]);

  return {
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      rollNumber: user.rollNumber,
      branch: user.branch,
      year: user.year,
      section: user.section,
      batch: user.batch,
      cgpa: user.cgpa,
      backlogs: user.backlogs,
      role: user.role,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
    },

    stats: {
      clubsFollowing: user.followedClubs.length,
      eventsRegistered: user.registeredEvents.length,
      discussionsCreated,
      placementApplications,
    },

    classroom,

    followedClubs: user.followedClubs,

    registeredEvents: user.registeredEvents,

    recentApplications,
  };
};
