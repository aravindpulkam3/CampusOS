// One-off migration for the Phase 1 auth/security changes. Idempotent: safe to
// re-run. Run from backend/ AFTER importing the roster (Admin → Roster):
//
//   node scripts/migratePhase1Auth.js --dry-run   # report only, writes nothing
//   node scripts/migratePhase1Auth.js
//
// What it does:
//  1. $unset User.refreshToken — refresh tokens now live hashed in Session
//     (every user logs in again once).
//  2. $unset Event.registrationCount — the count is now derived from
//     User.registeredEvents — and drop the cached upcoming-events payload that
//     still carries it.
//  3. Staff (placementCoordinator / superadmin): mark emailVerifiedAt so they
//     can keep logging in. Staff accounts are admin-provisioned, not on the roster.
//  4. Students: link each account to its roster entry when rollNumber, email
//     AND cohort (branch/batch/section) all match, copying the roster's
//     academic data. emailVerifiedAt stays null: the student activates through
//     the normal claim link, which proves they own the email. Everything that
//     cannot be linked is reported for an administrator to resolve.

import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import RosterEntry from "../models/RosterEntry.js";
import redisClient, { connectRedis } from "../config/redis.js";
import { withTransaction } from "../utils/transaction.js";

const DRY_RUN = process.argv.includes("--dry-run");
const UPCOMING_EVENTS_CACHE_KEY = "cache:events:upcoming";
const STAFF_ROLES = ["placementCoordinator", "superadmin"];

const log = (...args) => console.log(DRY_RUN ? "[dry-run]" : "[migrate]", ...args);

const run = async () => {
  await mongoose.connect(env.mongoUri);
  log(`connected (${env.nodeEnv})`);

  // 1. Legacy refresh tokens.
  const withToken = await User.collection.countDocuments({ refreshToken: { $exists: true } });
  if (!DRY_RUN && withToken) {
    await User.collection.updateMany({ refreshToken: { $exists: true } }, { $unset: { refreshToken: "" } });
  }
  log(`users with legacy refreshToken removed: ${withToken}`);

  // 2. Stored registration counts + stale cache.
  const withCount = await Event.collection.countDocuments({ registrationCount: { $exists: true } });
  if (!DRY_RUN && withCount) {
    await Event.collection.updateMany(
      { registrationCount: { $exists: true } },
      { $unset: { registrationCount: "" } },
    );
  }
  log(`events with stored registrationCount removed: ${withCount}`);

  if (redisClient) {
    await connectRedis();
    if (redisClient.isReady) {
      if (!DRY_RUN) await redisClient.del(UPCOMING_EVENTS_CACHE_KEY);
      log(`cache key ${UPCOMING_EVENTS_CACHE_KEY} deleted`);
    } else {
      log(`Redis unavailable — ${UPCOMING_EVENTS_CACHE_KEY} will expire on its own within 15 minutes`);
    }
  }

  // 3. Staff accounts.
  const staffFilter = { role: { $in: STAFF_ROLES }, emailVerifiedAt: null };
  const staff = await User.countDocuments(staffFilter);
  if (!DRY_RUN && staff) {
    await User.updateMany(staffFilter, { $set: { emailVerifiedAt: new Date() } });
  }
  log(`staff accounts marked verified: ${staff}`);

  // 4. Students → roster.
  const students = await User.find({ role: "student" })
    .select("_id email rollNumber branch batch section emailVerifiedAt")
    .lean();
  const linkedIds = new Set(
    (await RosterEntry.find({ claimedBy: { $ne: null } }).select("claimedBy").lean()).map((e) =>
      String(e.claimedBy),
    ),
  );

  const report = { alreadyLinked: 0, linked: 0, notOnRoster: [], mismatch: [], conflict: [] };
  for (const user of students) {
    if (linkedIds.has(String(user._id))) {
      report.alreadyLinked += 1;
      continue;
    }
    const entry = await RosterEntry.findOne({ rollNumber: user.rollNumber }).lean();
    if (!entry) {
      report.notOnRoster.push(`${user.rollNumber} <${user.email}>`);
      continue;
    }
    const differences = ["email", "branch", "batch", "section"].filter(
      (key) => String(entry[key]) !== String(user[key]),
    );
    if (differences.length) {
      report.mismatch.push(`${user.rollNumber}: roster and account differ in ${differences.join(", ")}`);
      continue;
    }
    if (entry.claimedBy) {
      report.conflict.push(`${user.rollNumber}: roster entry already claimed by another account`);
      continue;
    }

    if (!DRY_RUN) {
      // Roster link + academic copy together, or not at all.
      await withTransaction(async (session) => {
        const claim = await RosterEntry.updateOne(
          { _id: entry._id, claimedBy: null },
          { $set: { claimedBy: user._id } },
          { session },
        );
        if (claim.matchedCount !== 1) throw new Error(`roster entry ${entry.rollNumber} was claimed concurrently`);
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              firstName: entry.firstName,
              lastName: entry.lastName,
              year: entry.year,
              cgpa: entry.cgpa,
              backlogs: entry.backlogs,
            },
          },
          { session, runValidators: true },
        );
      });
    }
    report.linked += 1;
  }

  log(`students already linked: ${report.alreadyLinked}`);
  log(`students linked to the roster now: ${report.linked} (they activate via the Sign up / claim link)`);
  const section = (title, rows) => {
    log(`${title}: ${rows.length}`);
    for (const row of rows) console.log(`    - ${row}`);
  };
  section("students NOT on the roster (cannot log in until added to the roster)", report.notOnRoster);
  section("students whose roster row differs (fix the roster or the account)", report.mismatch);
  section("students whose roster entry belongs to another account", report.conflict);
};

try {
  await run();
} catch (err) {
  console.error("[migrate] failed:", err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  if (redisClient?.isOpen) redisClient.destroy();
}
