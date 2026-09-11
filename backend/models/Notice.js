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

    noticeType: {
      type: String,
      enum: [
        "announcement",
        "update",
        "deadline",
        "schedule_change",
        "result",
        "reminder",
      ],
      default: "announcement",
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

    attachments: [
      {
        name: String,
        url: String,
      },
    ],

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    expiresAt: {
      type: Date,
      default: null,
      
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);
noticeSchema.index({ targetType: 1, targetId: 1, isArchived: 1, createdAt: -1 });

export default mongoose.model("Notice", noticeSchema);