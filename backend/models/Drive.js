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

    startDate:{
      type:Date,
      required:true
    },
    
    endDate:{
      type:Date,
      required:true
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

    selectionProcess: [
      {
        name: String,
        order: Number,
      },
    ],

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

export default mongoose.model("Drive", driveSchema);