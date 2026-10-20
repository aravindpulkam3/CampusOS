// Demo data for looking at the UI: events, drives (one with an application
// under way), notices, deadlines, and extra timetable periods for today and
// Sunday. Dates are relative to the moment it runs, so re-run it to freshen.
// Run from backend/:
//
//   node scripts/seedDemo.js            # (re)seed — removes its own earlier rows first
//   node scripts/seedDemo.js --remove   # take every seeded row back out
//
// Every seeded document has a fixed _id derived from a key below, so the
// script only ever touches its own rows (and the ids it pushed onto the
// student's registeredEvents / the classroom's periods). Users, clubs, the
// classroom and its curriculum must already exist; they are looked up, not
// created.

import crypto from "crypto";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../models/User.js";
import Club from "../models/Club.js";
import Classroom from "../models/Classroom.js";
import Curriculum from "../models/Curriculum.js";
import Event from "../models/Event.js";
import Drive from "../models/Drive.js";
import Application from "../models/Application.js";
import Notice from "../models/Notice.js";
import Deadline from "../models/Deadline.js";
import redisClient, { connectRedis } from "../config/redis.js";

const REMOVE = process.argv.includes("--remove");
const log = (...args) => console.log("[seed-demo]", ...args);

const idFor = (key) =>
  new mongoose.Types.ObjectId(
    crypto.createHash("sha1").update(`seed-demo:${key}`).digest("hex").slice(0, 24),
  );

// ─── dates, all local time ────────────────────────────────────────────────
const now = new Date();
const at = (dayOffset, h, m = 0) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
};
const ago = (minutes) => new Date(now.getTime() - minutes * 60_000);
// Days from today to the coming Sunday / Monday (0 when today is that day).
const toWeekday = (target) => (target - now.getDay() + 7) % 7;
const SUN = toWeekday(0);
const MON = toWeekday(1) || 7;
const TODAY_NAME = now.toLocaleDateString("en-US", { weekday: "long" });
const mins = (h, m = 0) => h * 60 + m;

// ─── keys of everything this script creates ───────────────────────────────
const EVENT_KEYS = [
  "open-mic", "campus-run", "rust-workshop", "fireside", "robotics-expo",
  "hackathon", "freshers-contest", "football", "photo-walk", "git-bootcamp",
];
const DRIVE_KEYS = ["infosys", "zoho", "amazon", "deloitte", "ti", "razorpay", "tcs"];
const NOTICE_KEYS = [
  "wifi", "feedback", "library", "extra-classes", "lab-record", "seating",
  "rust-laptops", "run-kits", "run-reporting", "hack-teams", "infosys-tonight", "tcs-schedule",
];
const DEADLINE_KEYS = ["dsa-a4", "dbms-record", "cn-quiz", "oops-review"];
const PERIOD_KEYS = [
  "today-cn", "today-dbms", "today-oops", "today-evening",
  "sun-dsa", "sun-cn", "sun-oops", "sun-dbms",
];
const REGISTERED = ["open-mic", "campus-run", "hackathon"];

const ids = (keys) => keys.map(idFor);

const removeSeeded = async (studentId, classroomId) => {
  const results = await Promise.all([
    Event.deleteMany({ _id: { $in: ids(EVENT_KEYS) } }),
    Drive.deleteMany({ _id: { $in: ids(DRIVE_KEYS) } }),
    Application.deleteMany({ _id: idFor("application:tcs") }),
    Notice.deleteMany({ _id: { $in: ids(NOTICE_KEYS) } }),
    Deadline.deleteMany({ _id: { $in: ids(DEADLINE_KEYS) } }),
  ]);
  await User.updateOne(
    { _id: studentId },
    { $pull: { registeredEvents: { $in: ids(EVENT_KEYS) } } },
  );
  await Classroom.updateOne(
    { _id: classroomId },
    { $pull: { periods: { _id: { $in: ids(PERIOD_KEYS) } } } },
  );
  const removed = results.reduce((n, r) => n + r.deletedCount, 0);
  log(`removed ${removed} seeded documents, seeded periods and registrations`);
};

const clearCaches = async (classroomId) => {
  if (!redisClient) return;
  await connectRedis({ timeoutMs: 5_000 });
  if (!redisClient.isReady) {
    log("Redis unavailable — cached lists expire on their own");
    return;
  }
  const keys = [
    "cache:events:upcoming",
    "cache:drives:catalog:default",
    `cache:classroom:${classroomId}:academic`,
    `cache:notices:classroom:${classroomId}`,
  ];
  for await (const batch of redisClient.scanIterator({ MATCH: "cache:search:*", COUNT: 100 })) {
    keys.push(...(Array.isArray(batch) ? batch : [batch]));
  }
  await redisClient.del(keys);
  log(`cleared ${keys.length} cache keys`);
};

const run = async () => {
  await mongoose.connect(env.mongoUri);
  log(`connected (${env.nodeEnv})`);

  // ─── existing records the seed hangs off ────────────────────────────────
  const [student, admin, coordinator] = await Promise.all([
    User.findOne({ role: "student", classroom: { $ne: null } }),
    User.findOne({ role: "superadmin" }),
    User.findOne({ role: "placementCoordinator" }),
  ]);
  if (!student || !admin) throw new Error("Need a student with a classroom and a superadmin.");
  const poster = coordinator || admin;

  const classroom = await Classroom.findById(student.classroom);
  if (!classroom?.curriculum || !classroom.currentSemesterNumber) {
    throw new Error("The student's classroom needs a running semester with a curriculum.");
  }

  if (REMOVE) {
    await removeSeeded(student._id, classroom._id);
    await clearCaches(classroom._id);
    return;
  }

  const curriculum = await Curriculum.findById(classroom.curriculum).lean();
  const subject = (pattern) => {
    const found = curriculum.subjects.find((s) => pattern.test(s.name));
    return (found || curriculum.subjects[0])._id;
  };
  const DSA = subject(/dsa|data struct/i);
  const CN = subject(/^cn$|network/i);
  const DBMS = subject(/dbms|database/i);
  const OOPS = subject(/oop/i);

  const clubs = await Club.find().lean();
  const club = (pattern) => (clubs.find((c) => pattern.test(c.clubName)) || clubs[0])?._id;
  if (!clubs.length) throw new Error("Need at least one club.");
  const CODING = club(/coding/i);
  const TECH = club(/tech/i);
  const CULTURAL = club(/cultural/i);
  const STARTUP = club(/startup/i);
  const SPORTS = club(/sport|athletic/i);

  // Banners already uploaded for older events, reused so some cards have pictures.
  const banners = await Event.distinct("banner", {
    _id: { $nin: ids(EVENT_KEYS) },
    banner: { $nin: [null, ""] },
  });
  const banner = (i) => banners[i] ?? null;

  await removeSeeded(student._id, classroom._id);

  // ─── events ─────────────────────────────────────────────────────────────
  const event = (key, fields) => ({
    _id: idFor(key),
    createdBy: admin._id,
    eventOrganizers: [],
    tags: [],
    eligibleBranches: [],
    eligibleYears: [],
    ...fields,
  });
  const events = [
    event("open-mic", {
      eventName: "Open Mic Night",
      description:
        "Poetry, stand-up, acoustic sets — five minutes each, sign up at the stage. Bring friends, bring a blanket; the amphitheatre steps get cold after nine.",
      startDateTime: at(0, 19), endDateTime: at(0, 22, 30), registrationDeadline: at(0, 18),
      venue: "Open Air Amphitheatre", category: "Cultural", organizerClub: CULTURAL,
      tags: ["music", "poetry", "stand-up"], banner: banner(0),
    }),
    event("campus-run", {
      eventName: "Sunday Morning 5K Campus Run",
      description:
        "A relaxed 5 km loop around the campus ring road. Timed for those who want it, walkers welcome. Water and bananas at the finish line by the sports complex.",
      startDateTime: at(SUN, 6, 30), endDateTime: at(SUN, 8, 30), registrationDeadline: at(0, 23, 0),
      venue: "Main Gate", category: "Sports", organizerClub: SPORTS, tags: ["running", "fitness"],
    }),
    event("rust-workshop", {
      eventName: "Intro to Rust: Ownership Without Tears",
      description:
        "A hands-on afternoon: install the toolchain, write a CLI, and finally understand the borrow checker. No Rust experience needed; you should be comfortable in one language.",
      startDateTime: at(SUN, 14), endDateTime: at(SUN, 17), registrationDeadline: at(SUN, 12),
      venue: "Seminar Hall 2, Block B", category: "Technical", organizerClub: CODING,
      tags: ["rust", "workshop", "systems"], banner: banner(1),
    }),
    event("fireside", {
      eventName: "Founders' Fireside Chat",
      description:
        "Three alumni founders on their first year: hiring, money, and what they would do differently. Q&A after, chai on the house.",
      startDateTime: at(3, 17, 30), endDateTime: at(3, 19), registrationDeadline: at(3, 12),
      venue: "Auditorium", category: "Business", organizerClub: STARTUP, tags: ["startups", "alumni"],
    }),
    event("robotics-expo", {
      eventName: "Robotics Expo",
      description: "Student-built robots on show. Postponed — the hall is booked for exams; a new date will follow.",
      startDateTime: at(4, 10), endDateTime: at(4, 16), registrationDeadline: at(3, 18),
      venue: "Central Atrium", category: "Technical", organizerClub: TECH, status: "Cancelled",
    }),
    event("hackathon", {
      eventName: "HackSphere 24-Hour Hackathon",
      description:
        "Teams of two to four, 24 hours, three tracks: campus life, health, and open innovation. Mentors on hand all night, prizes worth ₹1.5 lakh, dinner and midnight maggi included.",
      startDateTime: at(6, 9), endDateTime: at(7, 9), registrationDeadline: at(4, 23, 59),
      venue: "Innovation Centre", category: "Technical", organizerClub: TECH,
      tags: ["hackathon", "teams", "prizes"], banner: banner(2),
    }),
    event("freshers-contest", {
      eventName: "Freshers' Coding Contest",
      description: "A two-hour contest for first and second years. Problems from easy to tricky, in C, C++, Java or Python.",
      startDateTime: at(5, 15), endDateTime: at(5, 17), registrationDeadline: at(4, 20),
      venue: "Computer Centre Lab 1", category: "Technical", organizerClub: CODING,
      eligibleYears: [1, 2], tags: ["contest"],
    }),
    event("football", {
      eventName: "Inter-Branch Football League",
      description: "Seven-a-side, branch against branch, four evenings of league games and a final under the lights.",
      startDateTime: at(9, 16), endDateTime: at(12, 19), registrationDeadline: at(7, 18),
      venue: "Main Football Ground", category: "Sports", organizerClub: SPORTS, tags: ["football", "league"],
    }),
    event("photo-walk", {
      eventName: "Photo Walk: The Old Campus",
      description: "Golden-hour walk through the heritage buildings with a short editing session after. Phones are fine.",
      startDateTime: at(13, 16, 30), endDateTime: at(13, 18, 30), registrationDeadline: at(12, 20),
      venue: "Heritage Block entrance", category: "Creative", organizerClub: CULTURAL, tags: ["photography"],
    }),
    event("git-bootcamp", {
      eventName: "Git & GitHub Bootcamp",
      description: "Branches, rebases, pull requests and recovering from mistakes.",
      startDateTime: at(-5, 14), endDateTime: at(-5, 17), registrationDeadline: at(-6, 20),
      venue: "Computer Centre Lab 2", category: "Technical", organizerClub: CODING, tags: ["git"],
    }),
  ];
  await Event.insertMany(events);
  await User.updateOne(
    { _id: student._id },
    { $addToSet: { registeredEvents: { $each: ids(REGISTERED) } } },
  );
  log(`events: ${events.length} (student registered for ${REGISTERED.length})`);

  // ─── drives ─────────────────────────────────────────────────────────────
  const drive = (key, fields) => ({
    _id: idFor(key),
    postedBy: poster._id,
    applicationLink: `https://careers.example.com/${key}`,
    batch: student.batch,
    minYear: 3,
    maxYear: 4,
    ...fields,
  });
  const tcsRounds = [
    { _id: idFor("tcs:r1"), name: "Online assessment", startDate: at(-4, 10), endedAt: at(-4, 13), processedAt: at(-3, 16) },
    { _id: idFor("tcs:r2"), name: "Technical interview", startDate: at(MON, 10), endedAt: null, processedAt: null },
    { _id: idFor("tcs:r3"), name: "HR interview", startDate: null, endedAt: null, processedAt: null },
  ];
  const drives = [
    drive("infosys", {
      companyName: "Infosys", role: "Systems Engineer", jobType: "fulltime", driveType: "oncampus",
      location: "Bengaluru / Pune / Hyderabad", ctc: "3.6 LPA", bond: "None",
      description: "Mass hiring for the 2027 batch. Training at the Mysuru campus before posting.",
      minCGPA: 6, maxBacklogs: 1, registrationDeadline: at(0, 23, 59), slots: 120,
      rounds: [{ name: "Online test" }, { name: "Interview" }],
    }),
    drive("zoho", {
      companyName: "Zoho", role: "Member of Technical Staff", jobType: "fulltime", driveType: "oncampus",
      location: "Chennai", ctc: "8.4 LPA",
      description: "Product engineering across Zoho's apps. Strong problem solving over framework knowledge.",
      eligibleBranches: ["CSE", "IT", "ECE"], minCGPA: 7, registrationDeadline: at(1, 18), slots: 15,
      rounds: [{ name: "Written test" }, { name: "Programming round" }, { name: "Technical interview" }, { name: "HR" }],
    }),
    drive("amazon", {
      companyName: "Amazon", role: "SDE Intern (6 months)", jobType: "internship", driveType: "oncampus",
      location: "Hyderabad", stipend: "₹1,10,000 / month",
      description: "Six-month internship with a pre-placement offer for strong performers.",
      eligibleBranches: ["CSE", "IT"], minCGPA: 7.5, registrationDeadline: at(5, 17),
      rounds: [{ name: "Online assessment" }, { name: "Technical interview 1" }, { name: "Technical interview 2" }],
    }),
    drive("deloitte", {
      companyName: "Deloitte", role: "Analyst — Technology Consulting", jobType: "fulltime", driveType: "poolcampus",
      location: "Gurugram / Bengaluru", ctc: "7.6 LPA",
      description: "Pool campus drive with four colleges; venue details follow after the shortlist.",
      minCGPA: 6.5, registrationDeadline: at(8, 23, 59),
    }),
    drive("ti", {
      companyName: "Texas Instruments", role: "Analog Design Engineer", jobType: "fulltime", driveType: "oncampus",
      location: "Bengaluru", ctc: "21 LPA",
      description: "Analog and mixed-signal design. Electronics branches only.",
      eligibleBranches: ["ECE", "EEE"], minCGPA: 7.5, registrationDeadline: at(6, 17),
    }),
    drive("razorpay", {
      companyName: "Razorpay", role: "Backend Engineer", jobType: "fulltime", driveType: "offcampus",
      location: "Bengaluru", ctc: "18 LPA",
      description: "Payments infrastructure in Go and Java. Off-campus: apply on the company site, the placement office tracks it.",
      eligibleBranches: ["CSE", "IT"], minCGPA: 8, registrationDeadline: at(12, 23, 59),
    }),
    drive("tcs", {
      companyName: "TCS", role: "Digital — Software Engineer", jobType: "fulltime", driveType: "oncampus",
      location: "Pan India", ctc: "7 LPA",
      description: "TCS Digital profile. Shortlisted candidates move on to the technical interview on Monday.",
      minCGPA: 6, registrationDeadline: at(-6, 23, 59),
      rounds: tcsRounds, currentRoundId: tcsRounds[1]._id, applicationCount: 1,
    }),
  ];
  await Drive.insertMany(drives);
  await Application.create({
    _id: idFor("application:tcs"),
    student: student._id,
    drive: idFor("tcs"),
    status: "active",
    appliedAt: at(-8, 11, 20),
    lastStatusUpdate: at(-3, 16),
    timeline: [
      { status: "active", note: "Applied by student via placement portal.", updatedBy: student._id, changedAt: at(-8, 11, 20) },
      { status: "active", note: "Shortlisted to continue to the next stage.", roundId: tcsRounds[0]._id, updatedBy: poster._id, changedAt: at(-3, 16) },
    ],
  });
  log(`drives: ${drives.length} (student applied to TCS, now in the technical interview)`);

  // ─── notices ────────────────────────────────────────────────────────────
  const notice = (key, fields) => ({ _id: idFor(key), createdBy: admin._id, ...fields });
  const notices = [
    notice("wifi", {
      targetType: "platform", priority: "high", createdAt: ago(90), expiresAt: at(MON, 0),
      title: "Campus Wi-Fi maintenance on Sunday, 7–10 am",
      content: "The network team is replacing core switches. Wi-Fi and LAN in the hostels and academic blocks will drop in and out between 7 and 10 am on Sunday.",
    }),
    notice("feedback", {
      targetType: "platform", priority: "normal", createdAt: ago(60 * 26), expiresAt: at(7, 23, 59),
      title: "Mid-semester feedback is open",
      content: "Tell us how your courses are going. The form takes five minutes and is anonymous; it closes next Saturday.",
    }),
    notice("library", {
      targetType: "platform", priority: "normal", isPinned: true, createdAt: ago(60 * 50),
      title: "Central library open 24×7 until exams end",
      content: "The reading hall on the ground floor stays open round the clock until the end of semester exams. Carry your ID card after 10 pm.",
    }),
    notice("extra-classes", {
      targetType: "classroom", targetId: classroom._id, semesterNumber: classroom.currentSemesterNumber,
      priority: "urgent", isPinned: true, createdAt: ago(45), expiresAt: at(SUN + 1, 0),
      title: "Extra classes this Sunday",
      content: "To cover the syllabus before mid-sems we have DSA, CN, an OOPs lab and DBMS on Sunday from 9:30 am. Attendance counts. The timetable has the rooms.",
    }),
    notice("lab-record", {
      targetType: "classroom", targetId: classroom._id, semesterNumber: classroom.currentSemesterNumber,
      priority: "high", createdAt: ago(60 * 5),
      title: "DBMS lab record due Monday",
      content: "Bring the completed record with all ten experiments signed. Records without the index page will be returned.",
    }),
    notice("seating", {
      targetType: "classroom", targetId: classroom._id, semesterNumber: null,
      priority: "normal", createdAt: ago(60 * 30),
      title: "Mid-semester seating plan",
      content: "Seating is by roll number across LH-201 to LH-204. The full plan is on the department notice board.",
    }),
    notice("rust-laptops", {
      targetType: "clubs", targetId: CODING, priority: "normal", createdAt: ago(60 * 3),
      title: "Rust workshop: bring a charged laptop",
      content: "Install rustup before you come if you can; we will help anyone who could not. Power points are limited.",
    }),
    notice("run-kits", {
      targetType: "clubs", targetId: SPORTS, priority: "normal", createdAt: ago(60 * 8),
      title: "Run kits at the sports complex",
      content: "Collect your bib and T-shirt from the sports complex office today until 8 pm.",
    }),
    notice("run-reporting", {
      targetType: "events", targetId: idFor("campus-run"), priority: "high", createdAt: ago(30),
      title: "Report by 6:15 am at the main gate",
      content: "Warm-up starts at 6:15 sharp. Bags can be left at the security cabin.",
    }),
    notice("hack-teams", {
      targetType: "events", targetId: idFor("hackathon"), priority: "normal", createdAt: ago(60 * 20),
      title: "Team registrations close Thursday",
      content: "Register your whole team before Thursday midnight. Solo entrants will be matched into teams on the first morning.",
    }),
    notice("infosys-tonight", {
      targetType: "drive", targetId: idFor("infosys"), priority: "urgent", createdAt: ago(120), createdBy: poster._id,
      title: "Infosys registrations close tonight",
      content: "Registration closes at 11:59 pm today. The online test is next Wednesday; admit cards will be mailed.",
    }),
    notice("tcs-schedule", {
      targetType: "drive", targetId: idFor("tcs"), priority: "high", createdAt: ago(60 * 24 * 2), createdBy: poster._id,
      title: "TCS technical interview schedule",
      content: "Interviews start Monday at 10 am in the placement cell. Carry two copies of your resume and your college ID.",
    }),
  ];
  await Notice.insertMany(notices);
  log(`notices: ${notices.length}`);

  // ─── deadlines ──────────────────────────────────────────────────────────
  const deadline = (key, fields) => ({
    _id: idFor(key),
    classroom: classroom._id,
    semesterNumber: classroom.currentSemesterNumber,
    postedBy: admin._id,
    ...fields,
  });
  const deadlines = [
    deadline("dsa-a4", {
      title: "DSA assignment 4 — graphs", type: "assignment", subject: DSA, dueDate: at(0, 23, 59),
      description: "Questions 1–6 from the sheet. Upload a single PDF.",
    }),
    deadline("dbms-record", {
      title: "DBMS lab record", type: "lab_exam", subject: DBMS, dueDate: at(MON, 9),
      description: "All ten experiments, signed.",
    }),
    deadline("cn-quiz", {
      title: "CN quiz 2", type: "quiz", subject: CN, dueDate: at(MON + 1, 10),
      description: "Transport layer: TCP, UDP, congestion control.",
    }),
    deadline("oops-review", {
      title: "OOPs mini-project review", type: "project", subject: OOPS, dueDate: at(6, 14),
      description: "Ten-minute demo per team, with the class diagram.",
    }),
  ];
  await Deadline.insertMany(deadlines);
  log(`deadlines: ${deadlines.length}`);

  // ─── timetable: the rest of today, and Sunday ──────────────────────────
  const period = (key, day, subjectId, start, end, room, faculty) => ({
    _id: idFor(key), day, subject: subjectId, startTime: start, endTime: end, room, faculty,
  });
  const today = TODAY_NAME === "Sunday" ? [] : [
    period("today-cn", TODAY_NAME, CN, mins(13), mins(14), "LH-204", "Dr. Meera Iyer"),
    period("today-dbms", TODAY_NAME, DBMS, mins(14), mins(16), "DB Lab, Block C", "Prof. Rahul Verma"),
    period("today-oops", TODAY_NAME, OOPS, mins(16, 15), mins(17, 15), "LH-204", "Dr. Sanjay Rao"),
    period("today-evening", TODAY_NAME, DSA, mins(20, 30), mins(22), "Seminar Hall 1", "Ms. Kavya Nair"),
  ];
  const periods = [
    ...today,
    period("sun-dsa", "Sunday", DSA, mins(9, 30), mins(11), "LH-201", "Dr. Anil Kumar"),
    period("sun-cn", "Sunday", CN, mins(11, 15), mins(12, 15), "LH-201", "Dr. Meera Iyer"),
    period("sun-oops", "Sunday", OOPS, mins(13, 30), mins(15, 30), "Software Lab 2", "Dr. Sanjay Rao"),
    period("sun-dbms", "Sunday", DBMS, mins(15, 45), mins(16, 45), "LH-202", "Prof. Rahul Verma"),
  ];
  // Today's slots skip anything that would overlap a period already on the timetable.
  const existing = classroom.periods.filter((p) => !ids(PERIOD_KEYS).some((id) => id.equals(p._id)));
  const fits = (p) =>
    !existing.some((e) => e.day === p.day && p.startTime < e.endTime && e.startTime < p.endTime);
  const added = periods.filter(fits);
  await Classroom.updateOne({ _id: classroom._id }, { $push: { periods: { $each: added } } });
  const skipped = periods.length - added.length;
  log(`periods: ${added.length} added (${TODAY_NAME} and Sunday)${skipped ? `, ${skipped} skipped for overlap` : ""}`);

  await clearCaches(classroom._id);
  log(`done — sign in as ${student.email} to see it`);
};

run()
  .catch((err) => {
    console.error("[seed-demo] failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    if (redisClient?.isOpen) redisClient.destroy();
  });
