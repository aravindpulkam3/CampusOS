import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";
import { verifyRefreshToken } from "../utils/generateToken.js";

// In-memory store (the library default): correct ONLY while CampusOS runs as a
// single Node process. Under PM2 cluster mode or multiple backend instances each
// process counts separately — move to a shared store (e.g. rate-limit-redis)
// before scaling out.
//
// Keys are chosen for students who share one campus/NAT IP: failed logins are
// capped per IP (generously) and per account, and refresh per session, so one
// person's failures can't lock out a whole lab. Limits and windows are
// configurable via RATE_LIMIT_* env vars (parsed in config/env.js).

const MINUTE_MS = 60 * 1000;
const limits = env.rateLimits;

const shared = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
};

// Failed logins only, per IP, across every email: caps password spraying (one
// guess tried against many accounts). Generous, because a whole lab can share
// one NAT address.
export const loginIpLimiter = rateLimit({
  ...shared,
  windowMs: limits.loginIpWindowMinutes * MINUTE_MS,
  limit: limits.loginIpMax,
  skipSuccessfulRequests: true,
});

// Normalized exactly as the auth service normalizes it. Only a string can be a
// key: an object such as {"$ne": null} must never become a bucket like
// "[object Object]".
const bodyEmail = (req) =>
  typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

// Failed logins only, per email, from any IP: caps guessing one account's
// password even when the attempts are spread over many IPs. A temporary 429,
// never an account lockout — so someone can delay a victim's logins for one
// window at most, which is the accepted trade-off.
export const loginEmailLimiter = rateLimit({
  ...shared,
  windowMs: limits.loginWindowMinutes * MINUTE_MS,
  limit: limits.loginMax,
  skipSuccessfulRequests: true,
  skip: (req) => !bodyEmail(req),
  keyGenerator: (req) => `email:${bodyEmail(req)}`,
});

// POST /forgot-password, per email address: every request counts (the response
// is always the same), so nobody can flood one inbox with reset emails.
export const forgotPasswordLimiter = rateLimit({
  ...shared,
  windowMs: 60 * MINUTE_MS,
  limit: 3,
  skip: (req) => !bodyEmail(req),
  keyGenerator: (req) => `email:${bodyEmail(req)}`,
});

// Per IP, generous enough for a lab signing up together at semester start.
export const signupLimiter = rateLimit({
  ...shared,
  windowMs: limits.signupWindowMinutes * MINUTE_MS,
  limit: limits.signupMax,
});

// Per session. A safety ceiling only: with the frontend's cross-tab refresh
// lock, normal use is ~1 refresh per access-token lifetime per tab.
export const refreshLimiter = rateLimit({
  ...shared,
  windowMs: limits.refreshWindowMinutes * MINUTE_MS,
  limit: limits.refreshMax,
  keyGenerator: (req) => {
    // Keyed on the VERIFIED session id (one HMAC, no DB). An unverified decode
    // would let anyone forge a victim's id and burn the victim's bucket. Not
    // keyed on a hash of the raw token either: each token is single-use, so a
    // per-token bucket would never cap a session, and garbage tokens would each
    // get a fresh bucket. Missing/invalid tokens share the caller's IP bucket.
    try {
      const { sid } = verifyRefreshToken(req.cookies?.refreshToken ?? "");
      if (typeof sid === "string" && sid) return `sid:${sid}`;
    } catch {
      // fall through to the IP bucket
    }
    return `ip:${ipKeyGenerator(req.ip)}`;
  },
});

// ─── authenticated write limits (mount AFTER authMiddleware) ──────────────────
// Per user, not per IP, so a lab behind one NAT isn't throttled together.
// Ceilings for abuse (comment floods, Cloudinary quota exhaustion), far above
// normal use.
const perUser = (req) => `user:${req.user._id}`;

// New discussions, comments and replies combined.
export const contentLimiter = rateLimit({
  ...shared,
  windowMs: 10 * MINUTE_MS,
  limit: 30,
  keyGenerator: perUser,
  message: { success: false, message: "You're posting too fast. Please wait a few minutes." },
});

// POST /api/v1/upload
export const uploadLimiter = rateLimit({
  ...shared,
  windowMs: 60 * MINUTE_MS,
  limit: 20,
  keyGenerator: perUser,
  message: { success: false, message: "Upload limit reached. Please try again later." },
});
