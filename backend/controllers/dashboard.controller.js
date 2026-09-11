import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import Deadline from "../models/Deadline.js";
import Notice from "../models/Notice.js";
import Event from "../models/Event.js";
import Drive from "../models/Drive.js";
import Discussion from "../models/Discussion.js";
import Application from "../models/Application.js";
import Classroom from "../models/Classroom.js";
import { searchAll } from "../services/dashboard.service.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const user = req.user;

  const [studentApplications, classroom] = await Promise.all([
    Application.find({ student: user._id }).select("drive").lean(),
    user.classroom ? Classroom.findById(user.classroom).lean() : null,
  ]);
  const appliedDriveIds = studentApplications.map((app) => app.drive);
  // Resolved up front (not inside the Promise.all below) because the
  // "current semester" queries depend on it — filtering by classroom +
  // dueDate alone isn't enough: an extension or a manual edit could leave a
  // stale semester's deadline with a future due date.
  const currentSemesterNumber = classroom?.currentSemesterNumber ?? null;

  const [deadlines, notices, events, drives, discussions, counts] =
    await Promise.all([
      // 1. Deadlines for this user's classroom's CURRENT semester, upcoming, nearest first
      currentSemesterNumber
        ? Deadline.find({
            classroom: user.classroom,
            semesterNumber: currentSemesterNumber,
            dueDate: { $gte: new Date() },
          })
            .sort({ dueDate: 1 })
            .limit(5)
            .lean()
        : [],

      // 2. Notices: platform-wide, or classroom-specific (general or tied to the current semester), pinned first then newest
      Notice.find({
        isArchived: false,
        expiresAt: { $not: { $lt: new Date() } },
        $or: [
          { targetType: "platform" },
          {
            targetType: "classroom",
            targetId: user.classroom,
            $or: [{ semesterNumber: null }, { semesterNumber: currentSemesterNumber }],
          },
        ],
      })
        .populate("createdBy", "firstName lastName")
        .sort({ isPinned: -1, priority: 1, createdAt: -1 })
        .limit(5)
        .lean(),

      // 3. Upcoming events
      Event.find()
        .populate("organizerClub", "clubName")
        .sort({ startDateTime: 1 })
        .limit(5)
        .lean(),

      Drive.find({
        _id: { $nin: appliedDriveIds },

        registrationDeadline: { $gte: new Date() },

        minCGPA: { $lte: user.cgpa || 0 },
        $or: [
          { eligibleBranches: { $size: 0 } },
          { eligibleBranches: user.branch },
        ],
      })
        .sort({ registrationDeadline: 1 }) // Closes soonest drops first
        .limit(5)
        .lean(),

      // 5. Recent discussions
      Discussion.find({ isDeleted: false })
        .populate("author", "firstName lastName")
        .sort({ lastActivityAt: -1 })
        .limit(3)
        .lean(),

      // 6. Stats — all in parallel
      Promise.all([
        Drive.countDocuments({ status: "open" }),

        Application.countDocuments({ student: user._id }),

        Application.countDocuments({
          student: user._id,
          status: "oa_scheduled",
        }),

        Application.countDocuments({
          student: user._id,
          status: "interview_scheduled",
        }),

        Event.countDocuments({
          endDateTime: { $gte: new Date() },
        }),

        // NEW — notices created in the last 24 hours for this user
        Notice.countDocuments({
          isArchived: false,
          expiresAt: { $not: { $lt: new Date() } },
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          $or: [
            { targetType: "platform" },
            {
              targetType: "classroom",
              targetId: user.classroom,
              $or: [{ semesterNumber: null }, { semesterNumber: currentSemesterNumber }],
            },
          ],
        }),

        // NEW — active applications (not rejected / withdrawn)
        Application.countDocuments({
          student: user._id,
          status: { $nin: ["rejected", "withdrawn"] },
        }),
      ]),
    ]);

  const [
    openDrives,
    applied,
    upcomingOA,
    upcomingInterviews,
    upcomingEvents,
    newNoticesCount, // NEW
    activeApplications, // NEW
  ] = counts;

  return sendResponse(res, 200, "Dashboard data fetched.", {
    classroom,
    deadlines,
    notices,
    events,
    drives,
    discussions,
    stats: {
      openDrives,
      applied,
      upcomingOA,
      upcomingInterviews,
      upcomingEvents,
      newNoticesCount, // NEW
      activeApplications, // NEW
    },
  });
});

export const globalSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2)
    return sendResponse(res, 200, "Search results", []);
  const results = await searchAll(q);
  return sendResponse(res, 200, "Search results", results);
});
