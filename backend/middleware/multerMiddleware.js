import multer from "multer";
import path from "path";
import fs from "fs";
import ApiError from "../utils/apiError.js";

// Ensure local temporary directory path structure exists
const tempDir = "./public/temp";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Append a unique suffix to prevent file naming duplication collisions
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Cheap first gate only: file.mimetype is client-supplied. The real content
// check is Cloudinary's (see utils/cloudinary.js); this list mirrors its
// allowed_formats so obviously wrong files fail before hitting the network.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new ApiError(400, "Only image or PDF files are allowed."));
  }
  cb(null, true);
};

export const upload = multer({
  storage: storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // matches ImageUploadZone's 5MB client check
});