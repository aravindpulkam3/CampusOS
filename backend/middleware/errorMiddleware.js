import http from "http";
import multer from "multer";
import ApiError from "../utils/apiError.js";
import { env } from "../config/env.js";

// Only messages we wrote ever reach the client: ApiError messages, plus the
// fixed messages below for errors we recognise. A third-party err.message is
// never trusted, whatever status it carries — it can hold internal details.

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: [413, "File too large."],
  LIMIT_UNEXPECTED_FILE: [400, "Unexpected file field."],
};

const DB_UNAVAILABLE = new Set(["MongoNetworkError", "MongoServerSelectionError"]);

// Returns { status, message, errors? } for recognised client errors, null otherwise.
const classify = (err) => {
  if (err instanceof ApiError) {
    return { status: err.statusCode, message: err.message };
  }

  // Mongo duplicate key
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue ?? err.keyPattern ?? {});
    return {
      status: 409,
      message:
        fields.length === 1
          ? `${fields[0]} already exists.`
          : "A record with these values already exists.",
    };
  }

  // Mongoose validation error. Validator messages are authored in our schemas;
  // Mongoose's own cast messages ("Cast to Number failed…") are not.
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.name === "CastError" ? `Invalid value for ${e.path}` : e.message,
    }));
    return {
      status: 400,
      message: errors.map((e) => e.message).join(", "),
      errors,
    };
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return { status: 400, message: "Invalid ID format." };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return { status: 401, message: "Invalid token." };
  }
  if (err.name === "TokenExpiredError") {
    return { status: 401, message: "Token expired." };
  }

  if (err instanceof multer.MulterError) {
    const [status, message] = MULTER_MESSAGES[err.code] ?? [400, "Invalid file upload."];
    return { status, message };
  }

  // body-parser
  if (err.type === "entity.parse.failed") {
    return { status: 400, message: "Malformed JSON request body." };
  }
  if (err.type === "entity.too.large") {
    return { status: 413, message: "Request body too large." };
  }

  return null;
};

const isDbUnavailable = (err) =>
  DB_UNAVAILABLE.has(err.name) || /buffering timed out/i.test(err.message ?? "");

const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const known = classify(err);
  if (known) {
    const body = { success: false, message: known.message };
    if (known.errors) body.errors = known.errors;
    return res.status(known.status).json(body);
  }

  if (isDbUnavailable(err)) {
    console.error("[ERROR] database unavailable", req.method, req.originalUrl, err.stack);
    return res
      .status(503)
      .json({ success: false, message: "Service temporarily unavailable." });
  }

  // Unrecognised error carrying a 4xx status (e.g. body-parser's 415): keep the
  // status, but answer with the standard reason phrase, not its message.
  const status = err.statusCode ?? err.status;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    console.warn(`[WARN] ${status} ${req.method} ${req.originalUrl}: ${err.message}`);
    return res
      .status(status)
      .json({ success: false, message: http.STATUS_CODES[status] ?? "Bad request." });
  }

  // Unexpected: a bug or a dependency failure.
  console.error("[ERROR]", req.method, req.originalUrl, `user=${req.user?._id ?? "-"}`, err.stack ?? err);
  // Fail closed: internal details only in explicit development mode.
  return res.status(500).json({
    success: false,
    message: env.isDevelopment
      ? err.message || "Internal server error."
      : "Internal server error.",
  });
};

// Mounted after every router so unknown routes get the same JSON error shape.
export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found.`));
};

export default errorMiddleware;
