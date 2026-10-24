import { randomUUID } from "crypto";
import pinoHttp from "pino-http";
import logger, { serializeError } from "../config/logger.js";

// One line per finished request: method, path, status, duration, user id and a
// request id. The id is generated here and returned as X-Request-Id, so a
// user's error report can be matched to the log; `req.log` lines carry it too.
// A client-sent X-Request-Id is ignored — nothing in front of the app is yet
// configured to overwrite it, so it could be anything.
//
// Whitelisted: no headers, no bodies, and the query string is dropped. The
// error handler sets res.err on failures it doesn't recognise, and this line
// then carries the error and its stack — so each failure is logged once.
const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  // pino-http hands these its own serialized req/res (req.url is originalUrl).
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url?.split("?")[0] }),
    res: (res) => ({ statusCode: res.statusCode }),
    err: serializeError,
  },
  // Evaluated when the response finishes, so req.user is set by then.
  customProps: (req) => (req.user ? { user: String(req.user._id) } : {}),
  quietReqLogger: true,
  // A health-check endpoint, once there is one, belongs in autoLogging.ignore.
});

export default requestLogger;
