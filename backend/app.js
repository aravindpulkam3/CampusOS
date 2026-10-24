import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./config/env.js";
import logger from "./config/logger.js";
import errorMiddleware, { notFound } from "./middleware/errorMiddleware.js";
import requestLogger from "./middleware/requestLogger.js";
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

// The Express app only — no DB connection, no listen(). server.js wires it to
// the HTTP server and Socket.IO; tests import it directly.
const app = express();
app.disable("x-powered-by");

// Express 'trust proxy' — parsed and validated (incl. refusing "true") in
// config/env.js. Unset/"false" (local dev): disabled, req.ip is the socket peer.
// Setting it here additionally rejects a malformed subnet/alias list.
const configureTrustProxy = () => {
  const log = logger.child({ module: "config" });
  if (env.trustProxy === false) {
    log.info("trust proxy: disabled");
    return;
  }
  try {
    app.set("trust proxy", env.trustProxy);
  } catch (err) {
    log.fatal({ err, trustProxy: env.trustProxy }, "invalid TRUST_PROXY");
    process.exit(1);
  }
  log.info({ trustProxy: env.trustProxy }, "trust proxy configured");
};
configureTrustProxy();

// First, so every response is logged — including originCheck's 403s, rate
// limiting's 429s and unknown routes.
app.use(requestLogger);
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

export default app;
