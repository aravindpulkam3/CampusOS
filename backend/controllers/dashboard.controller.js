import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import Deadline     from "../models/Deadline.js";
import Notice       from "../models/Notice.js";
import Event        from "../models/Event.js";
import Drive        from "../models/Drive.js";
import Discussion   from "../models/Discussion.js";
import Application  from "../models/Application.js";
import Classroom    from "../models/Classroom.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const user = req.user;

  const [classroom, deadlines, notices, events, drives, discussions, counts] =
    await Promise.all([

      Classroom.findById(user.classroom).lean(),

      // 1. Deadlines for this user's classroom, upcoming, nearest first
      Deadline.find({
        classroom: user.classroom,
        dueDate:   { $gte: new Date() },
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .lean(),

      // 2. Notices: platform-wide or classroom-specific, pinned first then newest
      Notice.find({
        isArchived: false,
        expiresAt:  { $not: { $lt: new Date() } },
        $or: [
          { targetType: "platform" },
          { targetType: "classroom", targetId: user.classroom },
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

      // 4. Open drives matching user eligibility, nearest deadline first
      Drive.find({
       
        minCGPA: { $lte: user.cgpa || 0 },
        $or: [
          { eligibleBranches: { $size: 0 } },
          { eligibleBranches: user.branch },
        ],
      })
        .sort({ registrationDeadline: 1 })
        .limit(5)
        .lean(),

      // 5. Recent discussions
      Discussion.find({ isDeleted: false })
        .populate("author", "firstName lastName")
        .sort({ lastActivityAt: -1 })
        .limit(5)
        .lean(),

      // 6. Stats — all in parallel
      Promise.all([
        Drive.countDocuments({ status: "open" }),

        Application.countDocuments({ student: user._id }),

        Application.countDocuments({ student: user._id, status: "oa_scheduled" }),

        Application.countDocuments({ student: user._id, status: "interview_scheduled" }),

        Event.countDocuments({
          startDateTime: { $gte: new Date() },
          status:        "Upcoming",
        }),

        // NEW — notices created in the last 24 hours for this user
        Notice.countDocuments({
          isArchived: false,
          expiresAt:  { $not: { $lt: new Date() } },
          createdAt:  { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          $or: [
            { targetType: "platform" },
            { targetType: "classroom", targetId: user.classroom },
          ],
        }),

        // NEW — active applications (not rejected / withdrawn)
        Application.countDocuments({
          student: user._id,
          status:  { $nin: ["rejected", "withdrawn"] },
        }),
      ]),
    ]);

  const [
    openDrives,
    applied,
    upcomingOA,
    upcomingInterviews,
    upcomingEvents,
    newNoticesCount,      // NEW
    activeApplications,   // NEW
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
      newNoticesCount,      // NEW
      activeApplications,   // NEW
    },
  });
});