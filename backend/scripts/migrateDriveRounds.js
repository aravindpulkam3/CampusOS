// One-off migration: Drive.selectionProcess -> Drive.rounds/currentRoundId/status,
// Application's old 9-value status enum -> active/rejected/selected.
//
// Uses the native driver directly (not the Mongoose models) so it can read
// and remove fields that no longer exist in the current schema definitions
// (selectionProcess, currentRound, the old status enum values).
//
// Run once, manually: node scripts/migrateDriveRounds.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const OLD_STATUS_TO_NEW = {
  registered: "active",
  oa_scheduled: "active",
  oa_completed: "active",
  interview_scheduled: "active",
  interview_completed: "active",
  offer_received: "active",
  selected: "selected",
  rejected: "rejected",
  withdrawn: "rejected",
};

const migrateDrives = async (drivesCollection, applicationsCollection) => {
  const cursor = drivesCollection.find({});
  let migrated = 0;

  while (await cursor.hasNext()) {
    const drive = await cursor.next();

    const oldRounds = Array.isArray(drive.selectionProcess)
      ? [...drive.selectionProcess].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : [];

    const rounds = oldRounds.map((r) => ({
      _id: new mongoose.Types.ObjectId(),
      name: r.name || "Round",
      startDate: null,
      endedAt: null,
      processedAt: null,
    }));

    // Signal from the old per-application currentRound Number: the highest
    // round number any application on this drive had reached.
    let currentRoundId = null;
    if (rounds.length > 0) {
      const apps = await applicationsCollection
        .find({ drive: drive._id }, { projection: { currentRound: 1 } })
        .toArray();
      const maxRound = apps.reduce(
        (max, a) => Math.max(max, a.currentRound || 0),
        0,
      );
      if (maxRound > 0) {
        const index = Math.min(maxRound - 1, rounds.length - 1);
        currentRoundId = rounds[index]._id;

        // Best-effort backfill (no precise historical timestamps exist):
        // every round strictly before the inferred current one is marked
        // ended+processed using the drive's updatedAt as a synthetic
        // approximation, since applications already show progress past them.
        const approxTimestamp = drive.updatedAt || new Date();
        for (let i = 0; i < index; i++) {
          rounds[i].endedAt = approxTimestamp;
          rounds[i].processedAt = approxTimestamp;
        }
      }
    }

    await drivesCollection.updateOne(
      { _id: drive._id },
      {
        $set: { rounds, currentRoundId, status: "active" },
        $unset: { selectionProcess: "" },
      },
    );
    migrated += 1;
  }

  console.log(`Migrated ${migrated} drive document(s).`);
};

const migrateApplications = async (applicationsCollection) => {
  const cursor = applicationsCollection.find({});
  let migrated = 0;

  while (await cursor.hasNext()) {
    const application = await cursor.next();
    const oldStatus = application.status;
    const newStatus = OLD_STATUS_TO_NEW[oldStatus] || "active";

    const update = {
      $set: { status: newStatus },
      $unset: { currentRound: "" },
    };

    if (oldStatus === "withdrawn") {
      update.$push = {
        timeline: {
          status: "rejected",
          note: "Previously withdrawn (migrated).",
          roundId: null,
          updatedBy: null,
          changedAt: new Date(),
        },
      };
    }

    await applicationsCollection.updateOne({ _id: application._id }, update);
    migrated += 1;
  }

  console.log(`Migrated ${migrated} application document(s).`);
};

const run = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    const drivesCollection = mongoose.connection.db.collection("drives");
    const applicationsCollection = mongoose.connection.db.collection("applications");

    await migrateDrives(drivesCollection, applicationsCollection);
    await migrateApplications(applicationsCollection);

    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();
