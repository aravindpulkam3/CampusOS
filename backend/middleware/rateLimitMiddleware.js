import "dotenv/config";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import jwt from "jsonwebtoken";

// In-memory store (the library default): correct ONLY while CampusOS runs as a
// single Node process. Under PM2 cluster mode or multiple backend instances each
// process counts separately — move to a shared store (e.g. rate-limit-redis)
// before scaling out.
//
// Keys are chosen for students who share one campus/NAT IP: login is keyed by
// IP + account and refresh by user, so one person's failures can't lock out a
// whole lab. Limits and windows are configurable via RATE_LIMIT_* env vars.

const MINUTE_MS = 60 * 1000;

const envInt = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (Number.isInteger(n) && n > 0) return n;
  console.warn(`[CONFIG] ${name}="${raw}" is not a positive integer; using default ${fallback}`);
  return fallback;
};

const shared = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
};

// Failed logins only, per (IP, email): caps password guessing against one
// account without charging classmates on the same network.
export const loginLimiter = rateLimit({
  ...shared,
  windowMs: envInt("RATE_LIMIT_LOGIN_WINDOW_MINUTES", 15) * MINUTE_MS,
  limit: envInt("RATE_LIMIT_LOGIN_MAX", 10),
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
  windowMs: envInt("RATE_LIMIT_SIGNUP_WINDOW_MINUTES", 60) * MINUTE_MS,
  limit: envInt("RATE_LIMIT_SIGNUP_MAX", 100),
});

// Per user. A safety ceiling only: with the frontend's single-flight refresh,
// normal use is ~1 refresh per access-token lifetime per tab.
export const refreshLimiter = rateLimit({
  ...shared,
  windowMs: envInt("RATE_LIMIT_REFRESH_WINDOW_MINUTES", 15) * MINUTE_MS,
  limit: envInt("RATE_LIMIT_REFRESH_MAX", 30),
  keyGenerator: (req) => {
    // Unverified decode, used only to choose a bucket — the refresh handler
    // still fully verifies the token. A forged id just gets its own bucket
    // and fails jwt.verify before any DB query.
    const userId = jwt.decode(req.cookies?.refreshToken ?? "")?.id;
    return userId ? `user:${userId}` : `ip:${ipKeyGenerator(req.ip)}`;
  },
});
