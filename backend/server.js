
import express from 'express'
import http from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js'
import errorMiddleware from './middleware/errorMiddleware.js'
import authRouter from './routes/auth.routes.js';
import clubRouter from './routes/club.routes.js';
import eventRouter from './routes/event.routes.js';
import noticeRouter from './routes/notice.routes.js';
import driveRouter from './routes/drive.routes.js';
import announcementRouter from './routes/announcement.routes.js';
import applicationRouter from './routes/application.routes.js';
import classRoomRouter, { adminClassroomRouter } from './routes/classroom.routes.js';
import curriculumRouter from './routes/curriculum.routes.js';
import discussionRouter from './routes/discussion.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import uploadRouter from './routes/upload.route.js';
import notificationRouter from './routes/notification.routes.js';
import { initSocket } from './sockets/socketHandler.js';
dotenv.config();
connectDB();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});
initSocket(io);

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth",authRouter);
app.use("/api/dashboard",dashboardRouter);
app.use('/api/clubs', clubRouter);
app.use('/api/events', eventRouter);
app.use('/api/classroom', classRoomRouter);
app.use('/api/admin/classroom', adminClassroomRouter);
app.use('/api/curriculum', curriculumRouter);
app.use('/api/discussions',discussionRouter);
app.use('/api/notices', noticeRouter);
app.use('/api/announcements', announcementRouter);

app.use('/api/drives',driveRouter);
app.use('/api/applications', applicationRouter);

app.use("/api/v1/upload", uploadRouter);
app.use("/api/notifications", notificationRouter);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
