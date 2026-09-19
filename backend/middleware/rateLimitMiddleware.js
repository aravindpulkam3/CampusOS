import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";
import { verifyRefreshToken } from "../utils/generateToken.js";

// In-memory store (the library default): correct ONLY while CampusOS runs as a
// single Node process. Under PM2 cluster mode or multiple backend instances each
// process counts separately — move to a shared store (e.g. rate-limit-redis)
// before scaling out.
//
// Keys are chosen for students who share one campus/NAT IP: login is keyed by
// IP + account and refresh by user, so one person's failures can't lock out a
// whole lab. Limits and windows are configurable via RATE_LIMIT_* env vars
// (parsed in config/env.js).

const MINUTE_MS = 60 * 1000;
const limits = env.rateLimits;

const shared = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
};

// Failed logins only, per (IP, email): caps password guessing against one
// account without charging classmates on the same network.
export const loginLimiter = rateLimit({
  ...shared,
  windowMs: limits.loginWindowMinutes * MINUTE_MS,
  limit: limits.loginMax,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return email ? `${ip}:${email}` : ip;
  },
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
