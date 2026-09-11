import mongoose from "mongoose";

const clubSchema = new mongoose.Schema(
  {
    clubName: {
      type: String,
      required: [true, "Club name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Technical", "Cultural", "Creative", "Business","Sports"],
    },
    logo: {
      type: String,
      default: null,
    },
    banner: {
      type: String,
      default: null,
    },
    clubAdmins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followerCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: false, // false until approved by Super Admin
    },
  },
  { timestamps: true }
);

const Club = mongoose.model("Club", clubSchema);
export default Club;