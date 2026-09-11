import Application from "../models/Application.js";
import Drive from "../models/Drive.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import ApiError from "../utils/apiError.js";
import deriveRoundStates from "../utils/roundState.js";
import { checkDriveEligibility } from "../services/eligibility.service.js";

// Attaches a computed (never persisted) derivedState to each round of a
// populated drive, so the frontend never has to re-implement the same
// upcoming/ongoing/ended_awaiting/processed derivation logic per page.
const withDerivedRounds = (application) => {
  if (application?.drive?.rounds) {
    application.drive.rounds = deriveRoundStates(
      application.drive.rounds,
      application.drive.currentRoundId,
    );
  }
  return application;
};

// ─── POST /api/applications/drive/:driveId ────────────────────────────────────
export const applyToDrive = asyncHandler(async (req, res) => {
  const { driveId } = req.params;
  const user = req.user;

  const drive = await Drive.findById(driveId);
  if (!drive) throw new ApiError(404, "Drive not found.");

  if (["completed", "cancelled"].includes(drive.status)) {
    throw new ApiError(400, "This drive is not open for applications.");
  }

  if (new Date() > new Date(drive.registrationDeadline)) {
    throw new ApiError(400, "The registration deadline for this drive has passed.");
  }

  // Same service the dashboard's Eligible Drives list uses, so a drive can never
  // be advertised as eligible and then rejected here.
  const { eligible, reasons } = checkDriveEligibility(drive, user);
  if (!eligible) {
    throw new ApiError(403, reasons.join(". "));
  }

  try {
    const application = await Application.create({
      student: user._id,
      drive: driveId,
      status: "active",
      timeline: [
        {
          status: "active",
          note: "Applied by student via placement portal.",
          updatedBy: user._id,
          changedAt: new Date(),
        },
      ],
      appliedAt: new Date(),
    });

    await Drive.findByIdAndUpdate(driveId, { $inc: { applicationCount: 1 } });

    return sendResponse(res, 201, "Application submitted successfully.", application);
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "You have already applied/registered for this placement drive.");
    }
    throw error;
  }
});

// ─── GET /api/applications/my ──────────────────────────────────────────────────
export const getMyApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ student: req.user._id })
    .populate({
      path: "drive",
      select:
        "companyName companyLogo role jobType ctc stipend registrationDeadline location rounds currentRoundId",
    })
    .sort({ appliedAt: -1 })
    .lean();

  const validApplications = applications
    .filter((app) => app.drive !== null)
    .map(withDerivedRounds);

  sendResponse(res, 200, "Applications fetched successfully.", validApplications);
});

// ─── GET /api/applications/:id ─────────────────────────────────────────────────
export const getApplicationById = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    student: req.user._id,
  })
    .populate(
      "drive",
      "companyName companyLogo role jobType ctc stipend registrationDeadline location rounds currentRoundId",
    )
    .lean();

  if (!application) throw new ApiError(404, "Application not found.");
  sendResponse(res, 200, "Application fetched.", withDerivedRounds(application));
});

// ─── PATCH /api/applications/:id/notes  (student updates own private notes) ───
export const updateApplicationNotes = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const application = await Application.findOneAndUpdate(
    { _id: req.params.id, student: req.user._id },
    { notes },
    { new: true },
  );

  if (!application) throw new ApiError(404, "Application not found.");
  sendResponse(res, 200, "Notes updated.", application);
});
