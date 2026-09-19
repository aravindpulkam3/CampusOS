import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    branch: {
      type: String,
      required: [true, "Branch is required"],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
      enum: [1, 2, 3, 4],
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
      uppercase: true,
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      index: true,
    },
    batch: {
      type: Number,
      required: [true, "Batch is required"],
      immutable: true,
    },
    rollNumber: {
      type: String,
      required: [true, "Roll number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    // Placement profile. `null` means "not provided", which is deliberately
    // distinct from a genuine 0 — eligibility must never claim a student is
    // ineligible just because they haven't filled this in. Authoritative:
    // copied from the college roster and changed only by the placement office
    // (routes/roster.routes.js) — students cannot edit them.
    cgpa: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
    backlogs: {
      type: Number,
      min: 0,
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
    resumeUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["student", "placementCoordinator", "superadmin"],
      default: "student",
    },
    registeredEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    followedClubs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Club",
      },
    ],

    mutedClubs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Club",
      },
    ],
    profilePicture: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
      maxlength: 300,
    },

    github: {
      type: String,
      default: "",
    },

    linkedin: {
      type: String,
      default: "",
    },

    portfolio: {
      type: String,
      default: "",
    },
    // Refresh tokens live in models/Session.js (hashed, one per device), not here.

    // Set when the user proves ownership of their roster email (claim link).
    // Login is refused while null. Staff accounts are set by the migration.
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Event registration lives here (single source of truth); this index backs the
// derived registration count and notifyEventRegistrants.
userSchema.index({ registeredEvents: 1 });
// Backs notifyClubFollowers and the follower-count reconciliation script.
userSchema.index({ followedClubs: 1 });

const User = mongoose.model("User", userSchema);
export default User;
