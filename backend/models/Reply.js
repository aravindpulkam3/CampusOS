import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
    },
    // If set → reply to a reply (shown as "@Name" in the flat thread).
    // If null → direct reply to the comment. Never queried on its own.
    parentReply: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reply",
      default: null,
    },
    // Populated from parentReply.author — used to render "@FirstName" mention
    replyingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Reply pages: equality on comment, then the {createdAt, _id} keyset.
replySchema.index({ comment: 1, createdAt: 1, _id: 1 });

export default mongoose.model("Reply", replySchema);
