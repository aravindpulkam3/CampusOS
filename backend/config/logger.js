import pino from "pino";
import { env } from "./env.js";

// The one logger. Modules take a child so every line says where it came from
// (`logger.child({ module: "redis" })`); inside a request use `req.log`, which
// carries the request id (middleware/requestLogger.js). Output is JSON on
// stdout — the process manager / container runtime collects it; development
// pretty-prints. Level comes from LOG_LEVEL (config/env.js), silent in tests.
//
// What gets logged is whitelisted, not filtered: never pass a request, a user
// document or a request body to the logger — pick the fields. The redaction
// below is only a backstop, and it matches only the depths it lists.
//
// config/env.js keeps using console: it runs before this module can (this
// module imports it) and reports configuration that may be invalid.

const SENSITIVE_KEYS = [
  "password",
  "currentPassword",
  "newPassword",
  "token",
  "refreshToken",
  "accessToken",
  "cookie",
  "authorization",
];

const redact = {
  paths: SENSITIVE_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]),
  censor: "[redacted]",
};

// A Mongo duplicate-key error repeats the duplicated values (an email, a roll
// number) in its message and stack: "… dup key: { email: \"a@b.edu\" }".
const scrub = (text) =>
  typeof text === "string"
    ? text.replace(/dup key: \{.*?\}/g, "dup key: { [redacted] }")
    : text;

// Keep only what helps debugging. Error objects carry enumerable extras — Mongo's
// keyValue, an HTTP client's response — that can hold personal data.
// Exported for middleware/requestLogger.js: pino-http replaces the logger's err
// serializer with its own unless given this one, and hands it an error that is
// already serialized — so both shapes are accepted here.
export const serializeError = (err) => {
  const s = err instanceof Error ? pino.stdSerializers.err(err) : err;
  if (!s || typeof s !== "object") return { message: String(s) };
  const out = {
    type: s.type,
    message: scrub(s.message),
    stack: scrub(s.stack),
  };
  if (s.code !== undefined) out.code = s.code;
  const status = s.statusCode ?? s.status;
  if (status !== undefined) out.statusCode = status;
  return out;
};

export const createLogger = (destination) =>
  pino(
    {
      level: env.logLevel,
      base: { service: "campusos-api" },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      serializers: { err: serializeError },
      redact,
      ...(env.isDevelopment &&
        !destination && {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, ignore: "pid,hostname,service" },
          },
        }),
    },
    destination,
  );

const logger = createLogger();

export default logger;
