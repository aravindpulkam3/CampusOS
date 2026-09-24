import dotenv from "dotenv";

// The single source of configuration. Every module that needs a setting
// imports `env` from here — nothing else reads process.env. Because an ES
// module is evaluated once, before any module that imports it, whichever
// module imports this first triggers loading + validation; correctness never
// depends on server.js import order or on side-effect imports.
//
// Invalid configuration is fatal: every problem is printed, then the process
// exits. There are no silent insecure defaults (e.g. NODE_ENV is required,
// because it decides whether auth cookies are Secure).

dotenv.config();

const problems = [];
const raw = (name) => {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? undefined : value.trim();
};
const required = (name) => {
  const value = raw(name);
  if (value === undefined) problems.push(`${name} is required`);
  return value;
};

// ─── NODE_ENV ─────────────────────────────────────────────────────────────────
const NODE_ENVS = ["development", "production", "test"];
const nodeEnv = required("NODE_ENV");
if (nodeEnv !== undefined && !NODE_ENVS.includes(nodeEnv)) {
  problems.push(`NODE_ENV must be one of ${NODE_ENVS.join(", ")}`);
}
const isProduction = nodeEnv === "production";
const isDevelopment = nodeEnv === "development";

// ─── JWT ──────────────────────────────────────────────────────────────────────
const MIN_SECRET_LENGTH = 32;
const jwtAccessSecret = required("JWT_ACCESS_SECRET");
const jwtRefreshSecret = required("JWT_REFRESH_SECRET");
for (const [name, value] of [
  ["JWT_ACCESS_SECRET", jwtAccessSecret],
  ["JWT_REFRESH_SECRET", jwtRefreshSecret],
]) {
  if (value !== undefined && value.length < MIN_SECRET_LENGTH) {
    problems.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters of random data`);
  }
}
if (jwtAccessSecret !== undefined && jwtAccessSecret === jwtRefreshSecret) {
  problems.push("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different");
}

// Durations like "15m" / "7d", returned in seconds. Parsed locally rather than
// with the `ms` package, which is only a transitive dependency of jsonwebtoken.
const DURATION_UNITS = { s: 1, m: 60, h: 3600, d: 86400 };
const duration = (name, fallback) => {
  const value = raw(name) ?? fallback;
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match || Number(match[1]) <= 0) {
    problems.push(`${name} must be a positive duration like 15m, 12h or 7d`);
    return undefined;
  }
  return Number(match[1]) * DURATION_UNITS[match[2]];
};
const accessExpirySec = duration("JWT_ACCESS_EXPIRY", "15m");
const refreshExpirySec = duration("JWT_REFRESH_EXPIRY", "7d");

// ─── URLs / services ──────────────────────────────────────────────────────────
const mongoUri = required("MONGO_URI");

// Exported as a bare ORIGIN (scheme://host[:port]): CORS compares it verbatim
// with the browser's Origin header and activation links append paths to it,
// so a trailing slash or path in the env value must not leak through.
const rawClientUrl = required("CLIENT_URL");
let clientUrl;
if (rawClientUrl !== undefined) {
  let parsed;
  try {
    parsed = new URL(rawClientUrl);
    clientUrl = parsed.origin;
  } catch {
    problems.push("CLIENT_URL must be a valid URL");
  }
  if (parsed && isProduction && parsed.protocol !== "https:") {
    problems.push("CLIENT_URL must use https:// in production");
  }
}

let port = 5000;
if (raw("PORT") !== undefined) {
  port = Number(raw("PORT"));
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    problems.push("PORT must be an integer between 1 and 65535");
  }
}

// Optional — cache only. Its value is never echoed (it can embed a password).
const redisUrl = raw("REDIS_URL");

// Express 'trust proxy', set explicitly per deployment so rate limiting sees
// the real client IP. Unset/"false": disabled. A number is a proxy hop count
// (Nginx only: 1; CloudFront -> Nginx: 2); anything else is Express's
// subnet/alias list. "true" is refused: it trusts every hop, making
// X-Forwarded-For spoofable.
let trustProxy = false;
const rawTrustProxy = raw("TRUST_PROXY");
if (rawTrustProxy !== undefined && rawTrustProxy.toLowerCase() !== "false") {
  if (rawTrustProxy.toLowerCase() === "true") {
    problems.push(
      "TRUST_PROXY=true is not allowed: it trusts every proxy hop, so X-Forwarded-For " +
        "can be spoofed to bypass rate limiting. Use a hop count (e.g. 1) or a subnet list",
    );
  } else {
    trustProxy = /^\d+$/.test(rawTrustProxy) ? Number(rawTrustProxy) : rawTrustProxy;
  }
}

// Interface the server binds to. Unset (development default): all interfaces.
// Production runs behind Nginx on the same VM, so Node must listen on loopback
// only (so X-Forwarded-For can't be forged by connecting to it directly) and
// must trust that proxy (otherwise every client appears as 127.0.0.1 and
// shares one rate-limit bucket).
const LOOPBACK_HOSTS = ["127.0.0.1", "::1", "localhost"];
const host = raw("HOST");
if (isProduction) {
  if (host === undefined || !LOOPBACK_HOSTS.includes(host)) {
    problems.push("HOST must be 127.0.0.1 in production (Node listens behind Nginx on the same machine)");
  }
  if (trustProxy === false) {
    problems.push("TRUST_PROXY is required in production (use TRUST_PROXY=loopback behind Nginx)");
  }
}

// Groups of settings that only make sense together: all set, or none set.
// `requiredInProduction` makes "none" an error in production.
const group = (names, { requiredInProduction }) => {
  const values = Object.fromEntries(names.map((name) => [name, raw(name)]));
  const missing = names.filter((name) => values[name] === undefined);
  if (missing.length === names.length) {
    if (requiredInProduction && isProduction) {
      problems.push(`${names.join(", ")} are required in production`);
    }
    return null;
  }
  if (missing.length > 0) {
    problems.push(`${missing.join(", ")} must be set together with ${names.join(", ")}`);
  }
  return values;
};

const cloudinaryVars = group(
  ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
  { requiredInProduction: true },
);

// Outbound mail (account verification links). Optional in development only —
// utils/mailer.js then logs links to the console instead of sending them.
const smtpVars = group(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"], {
  requiredInProduction: true,
});
let smtp = null;
if (smtpVars && Object.values(smtpVars).every((value) => value !== undefined)) {
  const smtpPort = Number(smtpVars.SMTP_PORT);
  if (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65535) {
    problems.push("SMTP_PORT must be an integer between 1 and 65535");
  }
  smtp = {
    host: smtpVars.SMTP_HOST,
    port: smtpPort,
    user: smtpVars.SMTP_USER,
    pass: smtpVars.SMTP_PASS,
    from: smtpVars.MAIL_FROM,
  };
}

// ─── Rate limits (/api/auth) ──────────────────────────────────────────────────
// Tuning knobs, not security switches: an invalid value warns and falls back
// to the default instead of refusing to boot.
const positiveInt = (name, fallback) => {
  const value = raw(name);
  if (value === undefined) return fallback;
  const n = Number(value);
  if (Number.isInteger(n) && n > 0) return n;
  console.warn(`[CONFIG] ${name}="${value}" is not a positive integer; using default ${fallback}`);
  return fallback;
};

const rateLimits = {
  // Failed logins per email address (from any IP).
  loginMax: positiveInt("RATE_LIMIT_LOGIN_MAX", 10),
  loginWindowMinutes: positiveInt("RATE_LIMIT_LOGIN_WINDOW_MINUTES", 15),
  // Failed logins per IP (across all email addresses).
  loginIpMax: positiveInt("RATE_LIMIT_LOGIN_IP_MAX", 100),
  loginIpWindowMinutes: positiveInt("RATE_LIMIT_LOGIN_IP_WINDOW_MINUTES", 15),
  signupMax: positiveInt("RATE_LIMIT_SIGNUP_MAX", 100),
  signupWindowMinutes: positiveInt("RATE_LIMIT_SIGNUP_WINDOW_MINUTES", 60),
  refreshMax: positiveInt("RATE_LIMIT_REFRESH_MAX", 30),
  refreshWindowMinutes: positiveInt("RATE_LIMIT_REFRESH_WINDOW_MINUTES", 15),
};

// ─── Fail fast ────────────────────────────────────────────────────────────────
if (problems.length > 0) {
  console.error("[CONFIG] invalid environment — refusing to start:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  isDevelopment,
  port,
  host,
  mongoUri,
  clientUrl,
  redisUrl,
  trustProxy,
  jwt: Object.freeze({
    accessSecret: jwtAccessSecret,
    refreshSecret: jwtRefreshSecret,
    accessExpirySec,
    refreshExpirySec,
  }),
  cloudinary: cloudinaryVars
    ? Object.freeze({
        cloudName: cloudinaryVars.CLOUDINARY_CLOUD_NAME,
        apiKey: cloudinaryVars.CLOUDINARY_API_KEY,
        apiSecret: cloudinaryVars.CLOUDINARY_API_SECRET,
      })
    : null,
  smtp: smtp ? Object.freeze(smtp) : null,
  rateLimits: Object.freeze(rateLimits),
});

export default env;
