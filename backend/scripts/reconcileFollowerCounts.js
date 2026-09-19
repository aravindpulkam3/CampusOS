// One-off reconciliation of Club.followerCount. Idempotent: safe to re-run.
// Run from backend/ AFTER deploying the transactional follow/unfollow code:
//
//   node scripts/reconcileFollowerCounts.js --dry-run   # report only, writes nothing
//   node scripts/reconcileFollowerCounts.js
//   node scripts/reconcileFollowerCounts.js --dry-run   # must report 0 mismatches
//
// The old read-modify-write follow toggle could inflate followerCount under
// concurrent requests. The new code keeps the counter exact only from a correct
// starting point, so each count is reset once to the true number of users
// following the club (User.followedClubs is the membership record).

import mongoose from "mongoose";
import { env } from "../config/env.js";
import Club from "../models/Club.js";
import User from "../models/User.js";
import redisClient, { connectRedis } from "../config/redis.js";

const DRY_RUN = process.argv.includes("--dry-run");
const CLUB_CACHE_KEYS = ["cache:clubs:all", "cache:clubs:popular"];

const log = (...args) => console.log(DRY_RUN ? "[dry-run]" : "[reconcile]", ...args);

const run = async () => {
  await mongoose.connect(env.mongoUri);
  log(`connected (${env.nodeEnv})`);

  const clubs = await Club.find().select("_id clubName followerCount").lean();
  let mismatches = 0;
  let fixed = 0;
  let changedDuringRun = 0;

  for (const club of clubs) {
    const actual = await User.countDocuments({ followedClubs: club._id });
    if (club.followerCount === actual) continue;
    mismatches += 1;
    log(`  ${club.clubName} (${club._id}): stored ${club.followerCount}, actual ${actual}`);
    if (DRY_RUN) continue;

    // Conditional on the value just read: a follow/unfollow committed in
    // between changes it, and this club is then left for a re-run.
    const result = await Club.updateOne(
      { _id: club._id, followerCount: club.followerCount },
      { $set: { followerCount: actual } },
    );
    if (result.modifiedCount === 1) fixed += 1;
    else changedDuringRun += 1;
  }

  log(`clubs checked: ${clubs.length}, mismatched: ${mismatches}`);
  if (!DRY_RUN) {
    log(`fixed: ${fixed}${changedDuringRun ? `, changed during run (re-run to fix): ${changedDuringRun}` : ""}`);
    if (fixed && redisClient) {
      await connectRedis();
      if (redisClient.isReady) {
        await redisClient.del(CLUB_CACHE_KEYS);
        log(`cache keys deleted: ${CLUB_CACHE_KEYS.join(", ")}`);
      } else {
        log("Redis unavailable — cached club lists expire on their own (popular: 1h, all: 24h)");
      }
    }
  }
};

try {
  await run();
} catch (err) {
  console.error("[reconcile] failed:", err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  if (redisClient?.isOpen) redisClient.destroy();
}
