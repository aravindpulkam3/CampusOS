import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "club_event",
        "club_announcement",
        "club_notice",
        "event_update",
        "event_announcement",
        "event_notice",
        "drive_new",
        "drive_notice",
        "application_status",
        "discussion_reply",
        "classroom_notice",
        "classroom_deadline",
        "platform_notice",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Set only for club_* types — the key mute filtering checks against.
    sourceClub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      default: null,
    },

    targetType: {
      type: String,
      enum: [
        "event",
        "drive",
        "discussion",
        "classroom",
        "notice",
        "announcement",
        "application",
        "deadline",
      ],
      default: null,
    },

    // Untyped, resolved per targetType — same convention as Notice.targetId
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
