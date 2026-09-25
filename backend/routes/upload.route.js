import { Router } from "express";
import { upload } from "../middleware/multerMiddleware.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import asyncHandler from "../utils/asyncHandler.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { uploadLimiter } from "../middleware/rateLimitMiddleware.js";
import ApiError from "../utils/apiError.js";

const uploadRouter = Router();

// Every folder the frontend's ImageUploadZone uses. Anything else is rejected
// so clients can't write to arbitrary Cloudinary paths.
const ALLOWED_FOLDERS = new Set([
  "general",
  "club-announcements",
  "event-announcements",
  "club-logos",
  "clubs-banners",
  "event-banners",
  "user-profiles",
  "student-resumes",
]);

// Runs before multer so a rejected request never writes a temp file.
const validateFolder = (req, res, next) => {
  const folder = req.query.folder ?? "general";
  if (typeof folder !== "string" || !ALLOWED_FOLDERS.has(folder)) {
    return next(new ApiError(400, "Invalid upload folder."));
  }
  req.uploadFolder = folder;
  next();
};

// POST /api/v1/upload?folder=<name>
uploadRouter.post("/", authMiddleware, uploadLimiter, validateFolder, upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded." });
  }

  const result = await uploadOnCloudinary(req.file.path, `eventsphere/${req.uploadFolder}`);

  if (!result) {
    throw new ApiError(502, "File upload failed. Please try again.");
  }

  return res.status(200).json({
    success: true,
    message: "File deployed to cloud infrastructure successfully.",
    url: result.secure_url,
    publicId: result.public_id,
  });
}));

export default uploadRouter;
