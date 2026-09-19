import { env } from "../config/env.js";

// Defence in depth for cookie auth. SameSite=Strict already stops cross-SITE
// requests from carrying the auth cookies; this also stops cross-ORIGIN
// requests from the same site (e.g. a sibling subdomain) from making
// state-changing calls. Browsers always send Origin on such requests, so a
// present Origin that is not our frontend is refused. Requests without an
// Origin (curl, server-to-server) carry no browser cookies by accident and
// pass through.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const allowedOrigin = new URL(env.clientUrl).origin;

const originCheck = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get("origin");
  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({ success: false, message: "Cross-origin request refused." });
  }
  next();
};

export default originCheck;
