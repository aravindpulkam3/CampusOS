import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./config/env.js";
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

// The Express app only — no DB connection, no listen(). server.js wires it to
// the HTTP server and Socket.IO; tests import it directly.
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
