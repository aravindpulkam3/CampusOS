import mongoose from "mongoose";

const periodSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    required: true,
  },

  // Points at curriculum.subjects[]._id (a different document) — validated
  // in the controller, not via `ref`, since it targets an embedded subdoc.
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  // Section-specific — who actually teaches this subject to THIS section.
  faculty: {
    type: String,
    trim: true,
  },

  room: {
    type: String,
    trim: true,
  },

  startTime: {
    type: Number,
    required: true,
    min: 0,
    max: 1439,
  },

  endTime: {
    type: Number,
    required: true,
    min: 0,
    max: 1439,
  },
});

const classroomSchema = new mongoose.Schema(
  {
    branch: {
      type: String,
      required: true,
      trim: true,
    },

    batch: {
      type: Number,
      required: true,
    },

    section: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    classRepresentative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    currentSemesterNumber: {
      type: Number,
      default: null,
      min: 1,
      max: 8,
    },

    curriculum: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Curriculum",
      default: null,
    },

    periods: [periodSchema],
  },
  {
    timestamps: true,
  }
);

classroomSchema.virtual("displayLabel").get(function () {
  return `${this.branch} ${this.batch} - ${this.section}`;
});

classroomSchema.set("toJSON", { virtuals: true });
classroomSchema.set("toObject", { virtuals: true });

classroomSchema.index({ branch: 1, batch: 1, section: 1 }, { unique: true });

export default mongoose.model("Classroom", classroomSchema);
