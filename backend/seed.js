import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import dotenv from "dotenv";

// ─── Update these paths to match your model files ────────────────
import Event from "./models/Event.js"; 
import {Announcement} from "./models/Announcement.js";

dotenv.config();

const SEED_COUNT = 22;

// ⚠️ REPLACE THIS with a valid Event ID from your database collection
const TARGET_EVENT_ID = "6a2fdf317df14419c27d3aa4"; 

const seedAnnouncements = async () => {
  try {
    // 1. Connect to Database
    console.log("Connecting to MongoDB pipeline...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Database linked successfully.");

    // 2. Verify target event node exists
    const targetEvent = await Event.findById(TARGET_EVENT_ID);
    if (!targetEvent) {
      throw new Error(`Target event with ID ${TARGET_EVENT_ID} not found. Please verify your ID.`);
    }
    console.log(`Found Event: "${targetEvent.eventName}". Commencing seed loop...`);

    // 3. Clear out old announcements for this event to avoid infinite asset pollution
    await Announcement.deleteMany({ targetType: "event", event: TARGET_EVENT_ID });
    console.log("🗑️ Cleared existing announcements for this event node.");

    const sampleAnnouncements = [];
    const now = new Date();

    // 4. Generate 20 items using a chronological spacing loop
    for (let i = 0; i < SEED_COUNT; i++) {
      // Spaces creation timestamps backwards sequentially so they sort beautifully via your backend pipeline
      const itemTimestamp = new Date(now.getTime() - i * 2 * 60 * 60 * 1000); // 2 hours apart

      sampleAnnouncements.push({
        title: `${faker.company.buzzAdjective()} Update #${SEED_COUNT - i}: ${faker.company.catchPhrase()}`,
        body: faker.lorem.paragraphs(2),
        targetType: "event",
        event: TARGET_EVENT_ID,
        // Uses the event creator or falls back to a dummy placeholder object validation identifier
        postedBy: targetEvent.createdBy || new mongoose.Types.ObjectId(), 
        createdAt: itemTimestamp,
        updatedAt: itemTimestamp
      });
    }

    // 5. Bulk write directly to MongoDB
    console.log(`Writing ${SEED_COUNT} announcements into database index layout...`);
    const results = await Announcement.insertMany(sampleAnnouncements);
    console.log(`✅ Success! Seeded ${results.length} announcement line items successfully.`);

  } catch (error) {
    console.error("❌ Seeding engine execution error cycle failed:", error.message);
  } finally {
    // 6. Close pipeline gracefully
    await mongoose.connection.close();
    console.log("Database connection pool closed safely.");
    process.exit(0);
  }
};

seedAnnouncements();