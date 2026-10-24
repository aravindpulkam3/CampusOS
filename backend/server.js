import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import logger from "./config/logger.js";
import connectDB from "./config/db.js";
import redisClient, { connectRedis } from "./config/redis.js";
import app from "./app.js";
import { initSocket } from "./sockets/socketHandler.js";
await connectDB(); // required dependency: exits the process on failure, so we never listen without it
void connectRedis(); // non-blocking and never rejects — Redis is optional

const httpServer = http.createServer(app);
// `cors` only governs HTTP long-polling; a WebSocket upgrade isn't subject to
// CORS. So, like originCheck for the REST API, refuse any handshake whose
// Origin is present and not our frontend (requests without one pass).
const socketAllowedOrigin = new URL(env.clientUrl).origin;
const io = new Server(httpServer, {
  cors: { origin: env.clientUrl, credentials: true },
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;
    callback(null, !origin || origin === socketAllowedOrigin);
  },
});
initSocket(io);

// HOST unset (development): all interfaces. Production requires loopback
// (enforced in config/env.js): only Nginx on the same machine can connect.
httpServer.listen(env.port, env.host, () =>
  logger.info(
    { host: env.host ?? "all interfaces", port: env.port },
    "server listening",
  ),
);

const log = logger.child({ module: "shutdown" });

// ─── graceful shutdown ─────────────────────────────────────────────────────────
const SHUTDOWN_DRAIN_MS = 10_000; // in-flight requests get this long to finish
const SHUTDOWN_BACKSTOP_MS = 15_000; // only fires if a bounded step below still hangs

let shuttingDown = false;

const shutdown = async (reason, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ reason }, "draining connections");

  setTimeout(() => {
    log.error("still not done, forcing exit");
    process.exit(1);
  }, SHUTDOWN_BACKSTOP_MS).unref();

  // io.close() disconnects every socket AND closes httpServer (Socket.IO 4),
  // resolving only once the HTTP server has fully closed — so httpServer.close()
  // must not be called separately.
  const closed = io.close();
  httpServer.closeIdleConnections();

  let drainTimer;
  const drained = await Promise.race([
    closed.then(() => true),
    new Promise((resolve) => {
      drainTimer = setTimeout(() => resolve(false), SHUTDOWN_DRAIN_MS);
    }),
  ]);
  clearTimeout(drainTimer);

  if (!drained) {
    log.warn(
      `requests still open after ${SHUTDOWN_DRAIN_MS / 1000}s, closing them`,
    );
    httpServer.closeAllConnections();
    await closed;
  }
  log.info("HTTP server and Socket.IO closed");

  try {
    await mongoose.connection.close();
    log.info("MongoDB connection closed");
  } catch (err) {
    log.error({ err }, "MongoDB close failed");
  }

  if (redisClient?.isOpen) {
    try {
      // close() waits for pending commands; destroy() also stops a reconnect loop.
      if (redisClient.isReady) await redisClient.close();
      else redisClient.destroy();
      log.info("Redis connection closed");
    } catch (err) {
      log.error({ err }, "Redis close failed");
    }
  }

  process.exit(exitCode);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Last-resort crash logging — not a substitute for asyncHandler/errorMiddleware.
// A stray rejection leaves the process consistent, so drain gracefully; an
// uncaught exception may not, so exit immediately. pino writes stdout
// synchronously and flushes its dev transport on exit, so the line isn't lost.
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandledRejection");
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  process.exit(1);
});
