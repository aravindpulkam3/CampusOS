import mongoose from "mongoose";

const driveSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    companyLogo: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    jobType: {
      type: String,
      enum: ["internship", "fulltime"],
      required: true,
    },

    driveType: {
      type: String,
      enum: ["oncampus", "offcampus", "poolcampus"],
      default: "oncampus",
    },

    location: {
      type: String,
      default: "",
    },

    ctc: {
      type: String,
      default: "",
    },

    stipend: {
      type: String,
      default: "",
    },

    bond: {
      type: String,
      default: "",
    },

    batch: {
      type: Number,
    },

    eligibleBranches: {
      type: [String],
      default: [],
    },

    minCGPA: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },

    minYear: {
      type: Number,
      default: 1,
    },

    maxYear: {
      type: Number,
      default: 4,
    },

    maxBacklogs: {
      type: Number,
      default: 0,
      min: 0,
    },

    slots: {
      type: Number,
      default: null,
    },

    registrationDeadline: {
      type: Date,
      required: true,
    },

    applicationLink: {
      type: String,
      required: true,
      trim: true,
    },

    brochureUrl: {
      type: String,
      default: "",
    },

    // Coordinator-defined recruitment sequence. Array position IS the process
    // order (Round 1, Round 2, ...) — not a sort by creation time or startDate.
    // No stored per-round status: UI state is always derived from these three
    // timestamps (see utils/roundState.js) — never persisted as a label.
    rounds: [
      {
        name: { type: String, required: true, trim: true },
        startDate: { type: Date, default: null }, // scheduled start; null = TBA
        endedAt: { type: Date, default: null }, // coordinator marks the physical round over
        processedAt: { type: Date, default: null }, // coordinator has processed this round's shortlist/result
      },
    ],

    // The recruitment stage the currently-active applicant cohort is
    // associated with — NOT whether that round is physically happening right
    // now. Only ever set by the dedicated advanceRound action.
    currentRoundId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Drive lifecycle. Terminal once completed/cancelled — only ever set by
    // the dedicated finishDrive/cancelDrive actions, never generic editing.
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },

    applicationCount: {
      type: Number,
      default: 0,
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
driveSchema.index({ status: 1, registrationDeadline: 1 });
driveSchema.index({ eligibleBranches: 1, minCGPA: 1 });
// GET /api/drives uses $text for the list's company/role search.
driveSchema.index({ companyName: "text", role: "text" });

export default mongoose.model("Drive", driveSchema);
