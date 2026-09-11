import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  code: {
    type: String,
    trim: true,
  },
});

const curriculumSchema = new mongoose.Schema(
  {
    branch: {
      type: String,
      required: true,
      trim: true,
    },

    // Shared across every admission batch — a branch's semester-N subject
    // list is one curriculum, reused by every classroom of that branch
    // currently in semester N regardless of when they were admitted.
    semesterNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },

    subjects: [subjectSchema],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

curriculumSchema.index(
  { branch: 1, semesterNumber: 1 },
  { unique: true }
);

export default mongoose.model("Curriculum", curriculumSchema);
