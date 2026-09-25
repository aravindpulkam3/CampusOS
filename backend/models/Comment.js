import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    discussion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discussion",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isAcceptedAnswer: { type: Boolean, default: false },
    replyCount: { type: Number, default: 0 },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);
// Comment pages: equality on discussion, then the {createdAt, _id} keyset the
// controller sorts and pages by. The discussion prefix also serves the
// accepted-answer lookup (it scans that one discussion's comments).
commentSchema.index({ discussion: 1, createdAt: 1, _id: 1 });

export default mongoose.model("Comment", commentSchema);
