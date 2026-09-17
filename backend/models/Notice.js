import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    targetType: {
      type: String,
      enum: [
        "classroom",
        "clubs",
        "events",
        "drive",
        "platform",
      ],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Only meaningful when targetType === "classroom". A snapshot number,
    // not a reference (there's no separate per-semester record). null =
    // general, persistent classroom notice; set = tied to the semester
    // active when it was posted, so it naturally stops surfacing once the
    // classroom's currentSemesterNumber moves past it.
    semesterNumber: {
      type: Number,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    isPinned: {
      type: Boolean,
      default: false,
    },

    // Optional — null means the notice stays visible indefinitely.
    expiresAt: {
      type: Date,
      default: null,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
noticeSchema.index({ targetType: 1, targetId: 1, isArchived: 1, createdAt: -1 });
noticeSchema.index({ targetType: 1, targetId: 1, isArchived: 1, expiresAt: 1 });

export default mongoose.model("Notice", noticeSchema);
