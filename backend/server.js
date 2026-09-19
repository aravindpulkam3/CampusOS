import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import connectDB from "./config/db.js";
import redisClient, { connectRedis } from "./config/redis.js";
import errorMiddleware, { notFound } from "./middleware/errorMiddleware.js";
import originCheck from "./middleware/originCheck.js";
import securityHeaders from "./middleware/securityHeaders.js";
import authRouter from "./routes/auth.routes.js";
import clubRouter from "./routes/club.routes.js";
import eventRouter from "./routes/event.routes.js";
import noticeRouter from "./routes/notice.routes.js";
import driveRouter from "./routes/drive.routes.js";
import announcementRouter from "./routes/announcement.routes.js";
import applicationRouter from "./routes/application.routes.js";
import classRoomRouter, {
  adminClassroomRouter,
} from "./routes/classroom.routes.js";
import curriculumRouter from "./routes/curriculum.routes.js";
import discussionRouter from "./routes/discussion.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import uploadRouter from "./routes/upload.route.js";
import notificationRouter from "./routes/notification.routes.js";
import rosterRouter from "./routes/roster.routes.js";
import { initSocket } from "./sockets/socketHandler.js";
await connectDB(); // required dependency: exits the process on failure, so we never listen without it
void connectRedis(); // non-blocking and never rejects — Redis is optional

const app = express();
app.disable("x-powered-by");

// Express 'trust proxy' — parsed and validated (incl. refusing "true") in
// config/env.js. Unset/"false" (local dev): disabled, req.ip is the socket peer.
// Setting it here additionally rejects a malformed subnet/alias list.
const configureTrustProxy = () => {
  if (env.trustProxy === false) {
    console.log("[CONFIG] trust proxy: disabled");
    return;
  }
  try {
    app.set("trust proxy", env.trustProxy);
  } catch (err) {
    console.error(`[CONFIG] invalid TRUST_PROXY "${env.trustProxy}": ${err.message}`);
    process.exit(1);
  }
  console.log(`[CONFIG] trust proxy: ${env.trustProxy}`);
};
configureTrustProxy();

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

app.use(securityHeaders);
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use("/api", originCheck);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/clubs", clubRouter);
app.use("/api/events", eventRouter);
app.use("/api/classroom", classRoomRouter);
app.use("/api/admin/classroom", adminClassroomRouter);
app.use("/api/admin/roster", rosterRouter);
app.use("/api/curriculum", curriculumRouter);
app.use("/api/discussions", discussionRouter);
app.use("/api/notices", noticeRouter);
app.use("/api/announcements", announcementRouter);

app.use("/api/drives", driveRouter);
app.use("/api/applications", applicationRouter);

app.use("/api/v1/upload", uploadRouter);
app.use("/api/notifications", notificationRouter);

app.use(notFound);
app.use(errorMiddleware);

httpServer.listen(env.port, () => console.log(`Server running on port ${env.port}`));

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
