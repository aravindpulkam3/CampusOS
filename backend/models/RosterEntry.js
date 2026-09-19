import mongoose from "mongoose";

// The college's authoritative student list, imported by a superadmin. A
// student account can only be created by claiming a roster entry through a
// verified email (see auth.service.js), so roll number, cohort and academic
// data come from here — never from what a student types at signup.
//
// Field formats deliberately mirror User and Classroom (section uppercase,
// branch trimmed, batch numeric) so findClassroomForUser matches them as-is.
const rosterEntrySchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      required: [true, "Roll number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    firstName: { type: String, required: [true, "First name is required"], trim: true },
    lastName: { type: String, required: [true, "Last name is required"], trim: true },
    branch: { type: String, required: [true, "Branch is required"], trim: true },
    batch: { type: Number, required: [true, "Batch is required"] },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
      uppercase: true,
    },
    year: { type: Number, required: [true, "Year is required"], enum: [1, 2, 3, 4] },
    // Placement-owned academic data. null = not on file (distinct from 0).
    cgpa: { type: Number, min: 0, max: 10, default: null },
    backlogs: { type: Number, min: 0, default: null },
    // The User this entry has been claimed by. Set atomically (conditional on
    // claimedBy: null) so an entry can never be claimed twice.
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

const RosterEntry = mongoose.model("RosterEntry", rosterEntrySchema);
export default RosterEntry;
