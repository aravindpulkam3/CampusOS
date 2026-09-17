import Club        from "../models/Club.js";
import Event       from "../models/Event.js";
import Drive       from "../models/Drive.js";
import Discussion  from "../models/Discussion.js";
import Application from "../models/Application.js";
import Classroom   from "../models/Classroom.js";
// Imported for its side effect of registering the schema: we populate
// classroom.curriculum below, and without this the model is only registered if
// some other module happened to be imported first.
import "../models/Curriculum.js";
import Deadline    from "../models/Deadline.js";
import Notice      from "../models/Notice.js";
import { getJSON, setJSON } from "../utils/cache.js";
import { getReachableRoundIndexes } from "../utils/roundState.js";
import {
  buildEligibilityFilter,
  getPlacementProfile,
} from "./eligibility.service.js";
const SEARCH_CACHE_TTL = 60 * 10; // 10m

// How far ahead Action Required looks for drives / deadlines / rounds. Events
// are deliberately today-only (see buildActionRequired).
const ACTION_WINDOW_DAYS = 2; // today + tomorrow

// An urgent notice with an explicit expiresAt is honoured for its full lifetime.
// This fallback applies ONLY to urgent notices with no expiry at all, which would
// otherwise pin themselves to Action Required forever (there is no TTL index).
const URGENT_NOTICE_NO_EXPIRY_MAX_AGE_DAYS = 30;

// Defensive bound against a runaway query, NOT a product limit — Action Required
// must never silently drop a real item. No realistic student reaches this.
const URGENT_NOTICE_SAFETY_CAP = 50;

const NOTICE_FEED_FETCH_LIMIT = 12;
const NOTICE_FEED_DISPLAY_LIMIT = 6;
const DEADLINE_DISPLAY_LIMIT = 5;
const ELIGIBLE_DRIVE_DISPLAY_LIMIT = 5;

const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

export const searchAll = async (q) => {
  const normalizedQuery = q.trim().toLowerCase().replace(/\s+/g, " ");
  const cacheKey = `cache:search:${normalizedQuery}`;

  const cached = await getJSON(cacheKey);
  if (cached) return cached;

  const regex = new RegExp(q.trim(), "i"); // to  make it case sensitive

  const [clubs, events, drives, discussions] = await Promise.all([ // Promiseall starts all 4 together
    Club.find({
      isActive: true,
      $or: [{ clubName: regex }, { description: regex }],
    })
      .select("_id clubName description logo")
      .limit(5)
      .lean(), // lean returns plain js objects instead of mongoose documents, you can just read em , cant to operations like save , validate,populate

    Event.find({
      $or: [{ eventName: regex }, { description: regex }],
    })
      .select("_id eventName banner startDateTime")
      .limit(5)
      .lean(),

    Drive.find({
      $or: [{ companyName: regex }, { role: regex }],
    })
      .select("_id companyName companyLogo role")
      .limit(5)
      .lean(),

    Discussion.find({ title: regex, isDeleted: false })
      .select("_id title author")
      .populate("author", "firstName lastName")
      .limit(5)
      .lean(),
  ]);

  const results = [  //creating just one plain array of objects
    ...clubs.map((c) => ({
      _id:      c._id,
      type:     "club",
      title:    c.clubName,
      subtitle: c.description?.slice(0, 60) || "Club",
      image:    c.logo || null,
      url:      `/community/clubs/${c._id}`,
    })),
    ...events.map((e) => ({
      _id:      e._id,
      type:     "event",
      title:    e.eventName,
      subtitle: e.startDateTime
        ? new Date(e.startDateTime).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })
        : "Event",
      image:    e.banner || null,
      url:      `/community/events/${e._id}`,
    })),
    ...drives.map((d) => ({
      _id:      d._id,
      type:     "drive",
      title:    d.companyName,
      subtitle: d.role,
      image:    d.companyLogo || null,
      url:      `/career/drives/${d._id}`,
    })),
    ...discussions.map((d) => ({
      _id:      d._id,
      type:     "discussion",
      title:    d.title,
      subtitle: d.author
        ? `by ${d.author.firstName} ${d.author.lastName}`
        : "Discussion",
      image:    null,
      url:      `/discussions/${d._id}`,
    })),
  ];

  await setJSON(cacheKey, results, SEARCH_CACHE_TTL);
  return results;
};

// ═══════════════════════════════════════════════════════════════════════════
// Student dashboard 

// Nothing here is cached per-user: every section is a function of (user, now),
// and the `now` dependency alone is disqualifying — a "closes today" item
// cached at 23:50 is wrong at 00:01. The dashboard has no dashboard-specific
// caching.
// ═══════════════════════════════════════════════════════════════════════════

// ─── time helpers ──────────────────────────────────────────────────────────
// All "today" maths is server-local. Set TZ=Asia/Kolkata in the environment so
// a UTC host doesn't roll the dashboard over at 05:30 IST — classroom.controller
// already depends on the same assumption via toLocaleDateString.
const startOfDay = (d) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (d) => {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const addDays = (d, n) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

const isSameDay = (a, b) =>
  a && b && startOfDay(a).getTime() === startOfDay(b).getTime();

// Classroom periods store minutes-since-midnight (0–1439), not Date or "HH:mm".
// Converting to an absolute timestamp is what lets classes, events and rounds
// share one sorted timeline.
const atMinutesToday = (startOfToday, totalMinutes) => {
  const d = new Date(startOfToday);
  d.setMinutes(d.getMinutes() + totalMinutes);
  return d;
};

// Returns false if the date's local time is exactly 00:00:00 (midnight).
// Often indicates the user picked a date but not a specific time.
const hasTime = (d) => {
  if (!d) return false;
  const date = new Date(d);
  return !(
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  );
};

// ─── section builders ──────────────────────────────────────────────────────

const buildScheduleFromPeriods = (classroom, subjectNameById, startOfToday) => {
  if (!classroom?.periods?.length) return [];

  const todayName = WEEKDAYS[startOfToday.getDay()];

  return classroom.periods
    .filter((p) => p.day === todayName)
    .map((p) => ({
      id: `class-${p._id}`,
      type: "class",
      title: subjectNameById.get(String(p.subject)) || "Class",
      subtitle: p.faculty || null,
      location: p.room || null,
      startAt: atMinutesToday(startOfToday, p.startTime),
      endAt: atMinutesToday(startOfToday, p.endTime),
      isOngoing: false,
      hasTime: true,
      url: `/academics/classroom/${classroom._id}`,
    }));
};

const buildScheduleFromEvents = (events, startOfToday, endOfToday) =>
  events
    .filter(
      (e) =>
        new Date(e.startDateTime) <= endOfToday &&
        new Date(e.endDateTime) >= startOfToday,
    )
    .map((e) => {
      const startAt = new Date(e.startDateTime);
      return {
        id: `event-${e._id}`,
        type: "event",
        title: e.eventName,
        subtitle: e.organizerClub?.clubName || null,
        location: e.venue || null,
        // The TRUE start is kept so the UI can say when a multi-day event began;
        // sorting uses a clamped key so yesterday's timestamp can't drag an
        // already-running event out of today's chronology.
        startAt,
        endAt: new Date(e.endDateTime),
        isOngoing: startAt < startOfToday,
        hasTime: !(startAt < startOfToday),
        url: `/community/events/${e._id}`,
      };
    });

// Only drives the student is genuinely still participating in, and only rounds
// they have actually reached. See getReachableRoundIndexes for the full rule.
const collectRelevantRounds = (activeDrives) => {
  const items = [];

  for (const drive of activeDrives) {
    const reachable = getReachableRoundIndexes(
      drive.rounds || [],
      drive.currentRoundId,
    );

    for (const index of reachable) {
      const round = drive.rounds?.[index];
      // A null startDate means the DATE is unknown, not just the time — such a
      // round can never be known to be today, so it is simply not scheduled.
      if (!round?.startDate) continue;

      items.push({
        id: `round-${drive._id}-${round._id}`,
        type: "drive",
        title: `${drive.companyName} — ${round.name}`,
        subtitle: drive.role || null,
        location: null,
        startAt: new Date(round.startDate),
        endAt: null, // rounds have no end time in the data model
        isOngoing: false,
        hasTime: hasTime(round.startDate),
        url: `/career/drives/${drive._id}`,
      });
    }
  }

  return items;
};

const toNoticeDTO = (notice) => {
  const SOURCE_TYPE = {
    clubs: "club",
    events: "event",
    drive: "drive",
    classroom: "classroom",
    platform: "platform",
  };

  const target = notice.targetId;
  const isPopulated = target && typeof target === "object";

  let sourceName = "CampusOS";
  let url = null;

  switch (notice.targetType) {
    case "clubs":
      sourceName = isPopulated ? target.clubName : "Club";
      url = `/community/clubs/${isPopulated ? target._id : target}`;
      break;
    case "events":
      sourceName = isPopulated ? target.eventName : "Event";
      url = `/community/events/${isPopulated ? target._id : target}`;
      break;
    case "drive":
      sourceName = isPopulated
        ? [target.companyName, target.role].filter(Boolean).join(" — ")
        : "Placement";
      url = `/career/drives/${isPopulated ? target._id : target}`;
      break;
    case "classroom":
      sourceName = "Classroom";
      url = `/academics/classroom/${isPopulated ? target._id : target}`;
      break;
    default:
      sourceName = "CampusOS";
      url = null; // no platform-wide notice list route exists
  }

  return {
    id: notice._id,
    title: notice.title,
    message: notice.content,
    sourceType: SOURCE_TYPE[notice.targetType] || "platform",
    sourceName,
    priority: notice.priority,
    isPinned: notice.isPinned,
    createdAt: notice.createdAt,
    url,
  };
};

// Action Required is the highest-priority section, so it is deliberately strict
// about WHAT qualifies — and deliberately complete about HOW MANY. Nothing is
// truncated here; folding past the 5th item is the frontend's job.
const buildActionRequired = ({
  eligibleUnappliedDrives,
  actionDeadlines,
  roundItems,
  eventItems,
  urgentNotices,
  now,
  startOfToday,
  endOfToday,
  actionWindowEnd,
}) => {
  const items = [];
  const severityFor = (when) => (isSameDay(when, now) ? "critical" : "warning");
  const whenLabel = (when) => (isSameDay(when, now) ? "today" : "tomorrow");

  for (const drive of eligibleUnappliedDrives) {
    const closesAt = new Date(drive.registrationDeadline);
    if (closesAt < now || closesAt > actionWindowEnd) continue;

    items.push({
      id: `drive_deadline-${drive._id}`,
      kind: "drive_deadline",
      severity: severityFor(closesAt),
      title: `${drive.companyName} — ${drive.role} applications close ${whenLabel(closesAt)}`,
      subtitle: drive.ctc ? `CTC ${drive.ctc}` : drive.jobType,
      dueAt: closesAt,
      url: `/career/drives/${drive._id}`,
      actionLabel: "Apply",
    });
  }

  for (const deadline of actionDeadlines) {
    const dueAt = new Date(deadline.dueDate);
    items.push({
      id: `deadline-${deadline._id}`,
      kind: "deadline",
      severity: severityFor(dueAt),
      title: `${deadline.title} due ${whenLabel(dueAt)}`,
      subtitle: deadline.subjectName || deadline.type,
      dueAt,
      url: deadline.url,
      actionLabel: "View",
    });
  }

  for (const round of roundItems) {
    if (round.startAt < startOfToday || round.startAt > actionWindowEnd) continue;

    items.push({
      id: `action-${round.id}`,
      kind: "round",
      severity: severityFor(round.startAt),
      title: `${round.title} ${whenLabel(round.startAt)}`,
      subtitle: round.subtitle,
      dueAt: round.startAt,
      url: round.url,
      actionLabel: "View drive",
    });
  }

  // Events are TODAY-only here, on purpose. A registered event tomorrow is
  // information, not an action item — letting "anything upcoming" in is what
  // turns an action list back into a digest.
  for (const event of eventItems) {
    if (event.startAt > endOfToday || event.endAt < startOfToday) continue;

    items.push({
      id: `action-${event.id}`,
      kind: "event",
      severity: "critical",
      title: event.isOngoing
        ? `${event.title} is happening now`
        : `${event.title} starts today`,
      subtitle: event.location,
      dueAt: event.isOngoing ? startOfToday : event.startAt,
      url: event.url,
      actionLabel: "View event",
    });
  }

  for (const notice of urgentNotices) {
    items.push({
      id: `action-notice-${notice.id}`,
      kind: "notice",
      severity: "critical",
      title: notice.title,
      subtitle: `${notice.sourceName} · urgent`,
      dueAt: notice.createdAt,
      url: notice.url,
      actionLabel: notice.url ? "View" : null,
    });
  }

  const severityRank = { critical: 0, warning: 1 };
  return items.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      new Date(a.dueAt) - new Date(b.dueAt),
  );
};

// Personalized notices from five sources, plus the urgent subset for Action
// Required — as TWO independent outputs of one $match.
//
// They cannot share a limit. Ranking pinned-first then slicing would let 13
// pinned "normal" notices push a single unpinned "urgent" one out of the feed,
// and if Action Required were derived from that slice the urgent notice would
// vanish entirely — the exact opposite of what "urgent" should guarantee.
const fetchNotices = async ({
  classroomId,
  currentSemesterNumber,
  followedClubIds,
  registeredEventIds,
  noticeDriveIds,
  now,
}) => {
  // Branches are pushed conditionally so empty id arrays never become { $in: [] }.
  const sources = [{ targetType: "platform" }];

  if (classroomId) {
    sources.push({
      targetType: "classroom",
      targetId: classroomId,
      $or: [
        { semesterNumber: null },
        { semesterNumber: currentSemesterNumber },
      ],
    });
  }
  if (followedClubIds.length) {
    sources.push({ targetType: "clubs", targetId: { $in: followedClubIds } });
  }
  if (registeredEventIds.length) {
    sources.push({ targetType: "events", targetId: { $in: registeredEventIds } });
  }
  if (noticeDriveIds.length) {
    // Applied ∪ eligible: covers both "results for a drive I'm in" and
    // "announcement for a drive I qualify for but haven't applied to".
    sources.push({ targetType: "drive", targetId: { $in: noticeDriveIds } });
  }

  const match = {
    isArchived: false,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      { $or: sources },
    ],
  };

  const urgentCutoff = addDays(now, -URGENT_NOTICE_NO_EXPIRY_MAX_AGE_DAYS);

  const priorityWeight = {
    $switch: {
      branches: [
        { case: { $eq: ["$priority", "urgent"] }, then: 3 },
        { case: { $eq: ["$priority", "high"] }, then: 2 },
        { case: { $eq: ["$priority", "normal"] }, then: 1 },
      ],
      default: 0,
    },
  };

  const [result] = await Notice.aggregate([
    { $match: match },
    {
      $facet: {
        // pinned → urgent → high → normal → low → newest. Ranked in Mongo, so
        // $limit lands AFTER ordering and no JS comparator can undo pinned-first.
        feed: [
          { $addFields: { priorityWeight } },
          { $sort: { isPinned: -1, priorityWeight: -1, createdAt: -1 } },
          { $limit: NOTICE_FEED_FETCH_LIMIT },
        ],
        // Urgent only, ranked on its own terms and NOT truncated as product
        // behaviour — the cap is runaway-query protection.
        urgent: [
          {
            $match: {
              priority: "urgent",
              // An explicit expiry is honoured in full, however far out. The age
              // fallback applies only to urgent notices with no expiry at all.
              $or: [
                { expiresAt: { $ne: null } },
                { createdAt: { $gte: urgentCutoff } },
              ],
            },
          },
          { $sort: { isPinned: -1, createdAt: -1 } },
          { $limit: URGENT_NOTICE_SAFETY_CAP },
        ],
      },
    },
  ]);

  const feed = result?.feed ?? [];
  const urgent = result?.urgent ?? [];

  // Resolve source names with at most 3 grouped populates (Club/Event/Drive) —
  // never one per notice.
  const all = [...feed, ...urgent];
  const byType = (types) => all.filter((n) => types.includes(n.targetType));

  await Promise.all([
    populateTargets(byType(["clubs"]), "Club", "clubName logo"),
    populateTargets(byType(["events"]), "Event", "eventName"),
    populateTargets(byType(["drive"]), "Drive", "companyName role"),
  ]);

  return { feed, urgent };
};

const populateTargets = (notices, model, select) =>
  notices.length
    ? Notice.populate(notices, { path: "targetId", model, select })
    : Promise.resolve();

// ─── orchestrator ──────────────────────────────────────────────────────────
export const buildStudentDashboard = async (user) => {
  const now = new Date();
  const startOfToday = startOfDay(now);
  const endOfToday = endOfDay(now);
  const actionWindowEnd = endOfDay(addDays(now, ACTION_WINDOW_DAYS - 1));

  // ── WAVE 1 ── everything else depends on these id sets.
  // req.user is already a fresh DB document (authMiddleware re-reads the User on
  // every request), so followedClubs/registeredEvents/cgpa/batch are current and
  // need no extra query.
  const [applications, classroom] = await Promise.all([
    Application.find({ student: user._id }).select("drive status").lean(),
    user.classroom
      ? Classroom.findById(user.classroom)
          .populate("curriculum", "subjects")
          .lean()
      : null,
  ]);

  const appliedDriveIds = applications.map((a) => a.drive);
  const appliedDriveIdSet = new Set(appliedDriveIds.map(String));
  const activeAppliedDriveIds = applications
    .filter((a) => a.status === "active")
    .map((a) => a.drive);

  const followedClubIds = user.followedClubs || [];
  const registeredEventIds = user.registeredEvents || [];
  const currentSemesterNumber = classroom?.currentSemesterNumber ?? null;

  // Subject ids on periods and deadlines point into curriculum.subjects[]._id —
  // resolve once here rather than leaking hex ids to the UI (or N+1-ing).
  const subjectNameById = new Map(
    (classroom?.curriculum?.subjects || []).map((s) => [String(s._id), s.name]),
  );

  const placementProfile = getPlacementProfile(user);

  // ── WAVE 2 ── independent of each other, dependent on wave 1.
  const [deadlineRows, registeredEvents, activeDrives, eligibleRows] =
    await Promise.all([
      // No limit here: the display slice happens below, and Action Required must
      // see EVERY deadline in its window (a limit(5) would silently drop the 6th
      // assignment due today).
      classroom && currentSemesterNumber
        ? Deadline.find({
            classroom: classroom._id,
            semesterNumber: currentSemesterNumber, // older semesters excluded
            dueDate: { $gte: startOfToday },
          })
            .sort({ dueDate: 1 })
            .lean()
        : [],

      // Plain overlaps-today test — events are today-only in both consumers.
      // Admits: starts today, runs entirely today, started earlier and still
      // running, multi-day spanning today. Excludes tomorrow-only.
      registeredEventIds.length
        ? Event.find({
            _id: { $in: registeredEventIds },
            status: { $ne: "Cancelled" },
            startDateTime: { $lte: endOfToday },
            endDateTime: { $gte: startOfToday },
          })
            .select("eventName venue startDateTime endDateTime organizerClub")
            .populate("organizerClub", "clubName")
            .lean()
        : [],

      // Drive.status gate is NOT redundant with Application.status: cancelDrive
      // does not cascade, so a cancelled drive's applicants stay "active".
      activeAppliedDriveIds.length
        ? Drive.find({ _id: { $in: activeAppliedDriveIds }, status: "active" })
            .select("companyName companyLogo role rounds currentRoundId")
            .lean()
        : [],

      // One query serves two consumers: the section's list (minus applied) and
      // the broader notice-targeting set (including applied), so the $nin is
      // applied in JS rather than Mongo.
      placementProfile.canEvaluateEligibility
        ? Drive.find({
            status: "active", // lifecycle gate the old query lacked entirely
            registrationDeadline: { $gte: now },
            ...buildEligibilityFilter(user),
          })
            .select(
              "companyName companyLogo role jobType ctc stipend registrationDeadline",
            )
            .sort({ registrationDeadline: 1 })
            .lean()
        : [],
    ]);

  const actionDeadlines = deadlineRows
    .filter((d) => new Date(d.dueDate) >= now && new Date(d.dueDate) <= actionWindowEnd)
    .map((d) => ({
      ...d,
      subjectName: subjectNameById.get(String(d.subject)) || null,
      url: `/academics/classroom/${classroom?._id}`,
    }));

  const eligibleUnappliedDrives = eligibleRows.filter(
    (d) => !appliedDriveIdSet.has(String(d._id)),
  );
  const eligibleDriveIds = eligibleRows.map((d) => d._id);

  // ── WAVE 3 ── notices depend on eligibleDriveIds from wave 2.
  const noticeDriveIds = [
    ...new Map(
      [...appliedDriveIds, ...eligibleDriveIds].map((id) => [String(id), id]),
    ).values(),
  ];

  const { feed: noticeFeed, urgent: urgentNoticeRows } = await fetchNotices({
    classroomId: classroom?._id,
    currentSemesterNumber,
    followedClubIds,
    registeredEventIds,
    noticeDriveIds,
    now,
  });

  const urgentNotices = urgentNoticeRows.map(toNoticeDTO);
  const promotedIds = new Set(urgentNotices.map((n) => String(n.id)));

  const notices = noticeFeed
    .filter((n) => !promotedIds.has(String(n._id))) // never show the same card twice
    .slice(0, NOTICE_FEED_DISPLAY_LIMIT)
    .map(toNoticeDTO);

  // ── WAVE 4 ── in-memory assembly only.
  const eventItems = buildScheduleFromEvents(
    registeredEvents,
    startOfToday,
    endOfToday,
  );
  const roundItems = collectRelevantRounds(activeDrives);

  const deadlineItems = deadlineRows
    .filter((d) => {
      const dueAt = new Date(d.dueDate);
      return dueAt >= startOfToday && dueAt <= endOfToday;
    })
    .map((d) => ({
      id: `deadline-${d._id}`,
      type: "deadline",
      title: d.title,
      subtitle: subjectNameById.get(String(d.subject)) || d.type,
      location: null,
      startAt: new Date(d.dueDate),
      endAt: null,
      isOngoing: false,
      hasTime: true,
      url: `/academics/classroom/${classroom?._id}`,
    }));

  // The schedule renders whenever ANY source has an item. No classroom means no
  // class periods — it must never mean "no schedule", since a student without a
  // classroom can still have a registered event or an OA today.
  const schedule = [
    ...buildScheduleFromPeriods(classroom, subjectNameById, startOfToday),
    ...eventItems,
    ...roundItems.filter(
      (r) => r.startAt >= startOfToday && r.startAt <= endOfToday,
    ),
    ...deadlineItems,
  ].sort((a, b) => {
    if (a.hasTime !== b.hasTime) {
      return a.hasTime ? -1 : 1;
    }

    // Clamp ongoing items to the start of today so an event that began
    // yesterday sorts to the top of today rather than by yesterday's timestamp.
    const aKey = Math.max(new Date(a.startAt).getTime(), startOfToday.getTime());
    const bKey = Math.max(new Date(b.startAt).getTime(), startOfToday.getTime());
    return aKey - bKey;
  });

  const actionRequired = buildActionRequired({
    eligibleUnappliedDrives,
    actionDeadlines,
    roundItems,
    eventItems,
    urgentNotices,
    now,
    startOfToday,
    endOfToday,
    actionWindowEnd,
  });

  return {
    generatedAt: now,

    profile: {
      classroomId: classroom?._id ?? null,
      classroomLabel: classroom
        ? `${classroom.branch} ${classroom.batch} - ${classroom.section}`
        : null,
      currentSemesterNumber,
      ...placementProfile,
    },

    actionRequired,
    schedule,
    notices,

    deadlines: deadlineRows.slice(0, DEADLINE_DISPLAY_LIMIT).map((d) => ({
      id: d._id,
      title: d.title,
      type: d.type,
      subject: subjectNameById.get(String(d.subject)) || null,
      dueDate: d.dueDate,
      url: `/academics/classroom/${classroom?._id}`,
    })),

    eligibleDrives: eligibleUnappliedDrives
      .slice(0, ELIGIBLE_DRIVE_DISPLAY_LIMIT)
      .map((d) => ({
        id: d._id,
        companyName: d.companyName,
        companyLogo: d.companyLogo,
        role: d.role,
        jobType: d.jobType,
        ctc: d.ctc,
        stipend: d.stipend,
        registrationDeadline: d.registrationDeadline,
        url: `/career/drives/${d._id}`,
      })),
  };
};