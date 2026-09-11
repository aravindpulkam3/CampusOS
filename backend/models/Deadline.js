import mongoose from "mongoose";

const deadlineSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "assignment",
        "quiz",
        "minor_exam",
        "lab_exam",
        "semester_exam",
        "project",
        "general",
      ],
      required: true,
    },

    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },

    // Snapshot of Classroom.currentSemesterNumber at creation time — not a
    // reference. There's no separate per-semester record to point at; this
    // is what lets "what's due this semester" stay correct even though the
    // classroom's timetable/curriculum get overwritten each semester. A
    // deadline is only editable while this still equals the classroom's
    // current semester number (enforced in the controller, not here).
    semesterNumber: {
      type: Number,
      required: true,
    },

    // Optional — points at classroom.curriculum's subjects[]._id AS OF
    // creation time, validated in the controller, not via `ref`. Once the
    // classroom advances past this deadline's semester, that curriculum may
    // no longer be the classroom's current one, so this is not re-validated
    // after creation — see the immutability rule on old-semester deadlines.
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    dueDate: {
      type: Date,
      required: true,
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

deadlineSchema.index({ classroom: 1, semesterNumber: 1, dueDate: 1 });

export default mongoose.model("Deadline", deadlineSchema);
