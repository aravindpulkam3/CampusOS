import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// One algorithm, pinned on both sides: jwt.sign takes the singular
// `algorithm`; every jwt.verify passes `algorithms: JWT_ALGORITHMS`.
export const JWT_ALGORITHM = "HS256";
export const JWT_ALGORITHMS = [JWT_ALGORITHM];

export const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, env.jwt.accessSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.jwt.accessExpirySec,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.jwt.accessSecret, { algorithms: JWT_ALGORITHMS });

// `sid` binds the token to its Session document; the random `jti` makes every
// token unique even when two are issued for the same session in one second.
// The caller computes `expiresInSec` so a token never outlives its session's
// absolute expiry (see issueRefresh in services/auth.service.js).
export const generateRefreshToken = (userId, sid, expiresInSec) =>
  jwt.sign(
    { id: userId, sid, jti: crypto.randomBytes(16).toString("hex") },
    env.jwt.refreshSecret,
    { algorithm: JWT_ALGORITHM, expiresIn: expiresInSec },
  );

export const verifyRefreshToken = (token, { ignoreExpiration = false } = {}) =>
  jwt.verify(token, env.jwt.refreshSecret, {
    algorithms: JWT_ALGORITHMS,
    ignoreExpiration,
  });
