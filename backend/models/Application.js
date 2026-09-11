import mongoose from "mongoose";

const timelineEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: "" },
    // Which round this status change corresponds to (null for entries that
    // predate round tracking, or that aren't tied to a specific round).
    roundId: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    }, // ← who made this change
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: true,
    },
    // Intentionally simple: "not applied" is the absence of this document.
    // An "active" application implicitly belongs to drive.currentRoundId —
    // this means "still participating in the recruitment process", not
    // "the physical round is presently happening".
    status: {
      type: String,
      enum: ["active", "rejected", "selected"],
      default: "active",
    },
    lastStatusUpdate: {
      type: Date,
      default: Date.now,
    },
    resumeUrl: { type: String, default: "" },

    timeline: { type: [timelineEntrySchema], default: [] },

    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// One application per student per drive — enforced at DB level
applicationSchema.index({ student: 1, drive: 1 }, { unique: true });
applicationSchema.index({ drive: 1, status: 1 });
applicationSchema.index({ student: 1, status: 1 });

const Application = mongoose.model("Application", applicationSchema);
export default Application;
