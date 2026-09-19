import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import ApiError from "./apiError.js";
import { env } from "../config/env.js";

// Configure credentials. env.cloudinary is null only outside production (it is
// required there); uploads then fail at Cloudinary and return null below.
cloudinary.config({
  cloud_name: env.cloudinary?.cloudName,
  api_key: env.cloudinary?.apiKey,
  api_secret: env.cloudinary?.apiSecret,
});

// Content validation happens here, not in multer (whose mimetype is
// client-supplied): resource_type "image" makes Cloudinary parse the actual
// bytes, and allowed_formats rejects everything else — including raw files such
// as HTML and SVG, which can carry scripts and were accepted under "auto".
// PDFs are image-type resources in Cloudinary, so resumes keep working.
const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "gif", "pdf"];

/**
 * Uploads a local file to Cloudinary and deletes the local temporary file safely.
 * Throws ApiError(400) when Cloudinary rejects the file itself; returns null on
 * any other failure.
 * @param {string} localFilePath - Path to the temp file saved by multer
 * @param {string} folder - Destination folder name inside Cloudinary dashboard
 */
export const uploadOnCloudinary = async (localFilePath, folder = "eventsphere") => {
  try {
    if (!localFilePath) return null;

    // Upload file to cloud asset storage pipeline
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
      allowed_formats: ALLOWED_FORMATS,
      folder: folder
    });

    // File uploaded successfully, remove local storage temp copy
    fs.unlinkSync(localFilePath);
    return response; // Contains .secure_url, .public_id, etc.
  } catch (error) {
    // If upload fails, remove the corrupted temp file from server storage safely anyway
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    // 400 = Cloudinary rejected the file itself (not a real image/PDF, or corrupt)
    if (error?.http_code === 400) {
      throw new ApiError(400, "Unsupported or corrupted file.");
    }
    console.error("Cloudinary upload failed utility error:", error);
    return null;
  }
};