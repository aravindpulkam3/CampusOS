import multer from "multer";

// CSV shortlist uploads are parsed once and discarded — they never need a
// permanent Cloudinary URL, so this deliberately does NOT reuse
// multerMiddleware.js's disk-temp pipeline. Kept in memory only.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const isCsv =
    file.mimetype === "text/csv" ||
    file.mimetype === "application/vnd.ms-excel" ||
    file.originalname.toLowerCase().endsWith(".csv");
  if (!isCsv) {
    return cb(new Error("Only CSV files are allowed."));
  }
  cb(null, true);
};

export const uploadCSV = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB is plenty for a roll-number list
});
