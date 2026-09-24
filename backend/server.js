import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { env } from "./config/env.js";
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
  console.log(`Server running on ${env.host ?? "all interfaces"}, port ${env.port}`),
);

// ─── graceful shutdown ─────────────────────────────────────────────────────────
const SHUTDOWN_DRAIN_MS = 10_000; // in-flight requests get this long to finish
const SHUTDOWN_BACKSTOP_MS = 15_000; // only fires if a bounded step below still hangs

let shuttingDown = false;

const shutdown = async (reason, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[SHUTDOWN] ${reason}: draining connections...`);

  setTimeout(() => {
    console.error("[SHUTDOWN] still not done, forcing exit");
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
    console.warn(
      `[SHUTDOWN] requests still open after ${SHUTDOWN_DRAIN_MS / 1000}s, closing them`,
    );
    httpServer.closeAllConnections();
    await closed;
  }
  console.log("[SHUTDOWN] HTTP server and Socket.IO closed");

  try {
    await mongoose.connection.close();
    console.log("[SHUTDOWN] MongoDB connection closed");
  } catch (err) {
    console.error("[SHUTDOWN] MongoDB close failed:", err.message);
  }

  if (redisClient?.isOpen) {
    try {
      // close() waits for pending commands; destroy() also stops a reconnect loop.
      if (redisClient.isReady) await redisClient.close();
      else redisClient.destroy();
      console.log("[SHUTDOWN] Redis connection closed");
    } catch (err) {
      console.error("[SHUTDOWN] Redis close failed:", err.message);
    }
  }

  process.exit(exitCode);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Last-resort crash logging — not a substitute for asyncHandler/errorMiddleware.
// A stray rejection leaves the process consistent, so drain gracefully; an
// uncaught exception may not, so exit immediately.
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] unhandledRejection:", reason?.stack ?? reason);
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException:", err?.stack ?? err);
  process.exit(1);
});
