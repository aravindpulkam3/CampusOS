// event controller
import Event from "../models/Event.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendResponse from "../utils/sendResponse.js";
import ApiError from "../utils/apiError.js";
import escapeRegex from "../utils/escapeRegex.js";
import { notifyClubFollowers, notifyEventRegistrants } from "../services/notification.service.js";
import { getJSON, setJSON, del } from "../utils/cache.js";
import { assertClubAdmin } from "../middleware/clubAdminMiddleware.js";
import { canManageEvent } from "../middleware/eventManagerMiddleware.js";

const UPCOMING_EVENTS_CACHE_KEY = "cache:events:upcoming";
const UPCOMING_EVENTS_TTL = 60 * 15; // 15m

// The only fields a client may set on create/update — exactly what EventForm
// sends. Anything else (createdBy, eventOrganizers, status, or a field added to
// the schema later) is ignored until deliberately listed.
// eventOrganizers and status are intentionally absent: no UI manages them, and
// changing them should be a dedicated, separately-authorized action.
const EVENT_WRITABLE_FIELDS = [
  "eventName",
  "description",
  "startDateTime",
  "endDateTime",
  "registrationDeadline",
  "venue",
  "banner",
  "category",
  "tags",
  "organizerClub",
  "eligibleBranches",
  "eligibleYears",
];

const pickEventFields = (body) => {
  const fields = {};
  for (const key of EVENT_WRITABLE_FIELDS) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  return fields;
};

// Date invariants every stored event must satisfy. `current` supplies the
// stored value for any side not being changed (updates). Unparseable dates are
// left for the schema's Date cast to reject.
//  - the event ends after it starts;
//  - registration closes no later than the start — registering for an event
//    that has already started is never possible.
const assertEventDates = (updates, current = {}) => {
  const pick = (key) => (updates[key] !== undefined ? updates[key] : current[key]);
  const start = pick("startDateTime") ? new Date(pick("startDateTime")) : null;
  const end = pick("endDateTime") ? new Date(pick("endDateTime")) : null;
  const deadlineRaw = pick("registrationDeadline");
  const deadline = deadlineRaw ? new Date(deadlineRaw) : null;

  if (start && end && !isNaN(start) && !isNaN(end) && end <= start) {
    throw new ApiError(400, "End date and time must be after the start timeline");
  }
  if (start && deadline && !isNaN(start) && !isNaN(deadline) && deadline > start) {
    throw new ApiError(400, "Registration deadline must be on or before the event start");
  }
};

// Registration cutoff, enforced defensively at registration time even though
// writes now guarantee deadline <= start: events stored before that rule may
// still have a later deadline. The earlier of the two always wins.
const registrationCutoff = (event) => {
  const start = new Date(event.startDateTime);
  if (!event.registrationDeadline) return start;
  const deadline = new Date(event.registrationDeadline);
  return deadline < start ? deadline : start;
};

// Derived from the single source of truth (User.registeredEvents, indexed).
const countRegistrations = (eventId) => User.countDocuments({ registeredEvents: eventId });

// TODO: implement controller function
export const createEvent = asyncHandler(async (req, res) => {
  const fields = pickEventFields(req.body);
  assertEventDates(fields);

  // Authorize against the exact club the event is being created for.
  await assertClubAdmin(req.user, fields.organizerClub);

  const event = await Event.create({
    ...fields,
    createdBy: req.user._id,
  });

  await del(UPCOMING_EVENTS_CACHE_KEY);

  notifyClubFollowers(event.organizerClub, req.user._id, {
    type: "club_event",
    title: "New club event",
    message: `${event.eventName} was just posted.`,
    targetType: "event",
    targetId: event._id,
    createdBy: req.user._id,
  });

  sendResponse(res, 201, "Event created successfully", event);
});

export const getAllEvents = asyncHandler(async (req, res) => {
  // Strings only (Express 4 turns `?category[$ne]=x` into an object, and this
  // is an aggregate, which Mongoose does not cast); offset clamped to >= 0.
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const search = req.query.search;
  const skipCount = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const limitCount = 15;
  const now = new Date();

  // 1. Construct Dynamic Aggregate Filters
  const matchConditions = { status: { $ne: "Cancelled" } };
  
  if (category && category !== "All") {
    matchConditions.category = category;
  }

  if (typeof search === "string" && search.trim() !== "") {
    const searchRegex = new RegExp(escapeRegex(search.trim()), "i");
    matchConditions.$or = [
      { eventName: searchRegex },
      { venue: searchRegex },
      { category: searchRegex }
    ];
  }

  // 2. Fetch the target data using an aggregation pipeline
  const pipeline = [
    { $match: matchConditions },
    {
      $addFields: {
        tier: {
          $switch: {
            branches: [
              {
                case: {
                  $and: [
                    { $lte: ["$startDateTime", now] },
                    { $gte: ["$endDateTime", now] }
                  ]
                },
                then: 1 // Ongoing
              },
              {
                case: { $gt: ["$startDateTime", now] },
                then: 2 // Upcoming
              }
            ],
            default: 3 // Completed
          }
        }
      }
    },
    {
      $addFields: {
        sortDate: {
          $cond: {
            if: { $eq: ["$tier", 3] },
            // For completed events, most recent first (descending end date)
            then: { $multiply: [{ $toLong: "$endDateTime" }, -1] },
            // For ongoing/upcoming, nearest first (ascending start date)
            else: { $toLong: "$startDateTime" }
          }
        }
      }
    },
    { $sort: { tier: 1, sortDate: 1 } },
    {
      $facet: {
        metadata: [{ $count: "totalRecords" }],
        data: [
          { $skip: skipCount },
          { $limit: limitCount },
          {
            $lookup: {
              from: "clubs",
              localField: "organizerClub",
              foreignField: "_id",
              pipeline: [
                { $project: { clubName: 1, logo: 1 } }
              ],
              as: "organizerClub"
            }
          },
          {
            $unwind: {
              path: "$organizerClub",
              preserveNullAndEmptyArrays: true
            }
          }
        ]
      }
    }
  ];

  const results = await Event.aggregate(pipeline);
  const totalRecords = results[0].metadata[0]?.totalRecords || 0;
  const paginatedResults = results[0].data;
  const hasMore = skipCount + limitCount < totalRecords;

  return sendResponse(res, 200, "Events fetched successfully.", {
    events: paginatedResults,
    hasMore,
    nextOffset: skipCount + paginatedResults.length,
    totalRecords
  });
});

export const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate("organizerClub", "clubName logo")
    .populate("createdBy", "firstName lastName");
  if (!event) {
    throw new ApiError(404, "Event not found.");
  }
  // isOrganizer = "may manage this event" (the eventManagerMiddleware rule), so
  // club admins get the page's manage controls, not just listed organizers.
  const [isOrganizer, registrationCount] = await Promise.all([
    canManageEvent(req.user, event),
    countRegistrations(event._id),
  ]);
  sendResponse(res, 200, "Events fetched Successfully", {
    event,
    isOrganizer,
    isRegistered: req.user.registeredEvents.some((id) => id.equals(event._id)),
    registrationCount,
  });
});

// Registration state lives only on User.registeredEvents, so registering is
// ONE atomic conditional write: the `$ne` guard and the `$push` apply to a
// single document together, so N parallel requests register exactly once.
// There is no counter to keep in sync — the count is derived.
//
// Residual, accepted non-atomicity: the cancelled/cutoff checks and the push
// are two operations, so an event cancelled in the milliseconds between them
// can still take one registration. Harmless while events have no capacity; a
// capacity limit would require a real transaction (utils/transaction.js) —
// never withOptionalTransaction, which silently drops atomicity.
export const registerForEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  if (event.status === "Cancelled") {
    throw new ApiError(400, "This event has been cancelled");
  }
  if (new Date() >= registrationCutoff(event)) {
    throw new ApiError(400, "Registration for this event is closed");
  }
  if (
    event.eligibleBranches?.length > 0 &&
    !event.eligibleBranches.includes(req.user.branch)
  ) {
    throw new ApiError(403, "Your branch is not eligible for this event");
  }
  if (
    event.eligibleYears?.length > 0 &&
    !event.eligibleYears.includes(req.user.year)
  ) {
    throw new ApiError(403, "Your year is not eligible for this event");
  }

  // The membership condition is in the filter, so matchedCount says whether
  // anything changed (modifiedCount is unreliable with timestamps).
  const result = await User.updateOne(
    { _id: req.user._id, registeredEvents: { $ne: event._id } },
    { $push: { registeredEvents: event._id } },
  );
  if (result.matchedCount === 0) {
    throw new ApiError(409, "Already registered");
  }

  sendResponse(res, 201, "Registered Successfully", {
    event,
    isRegistered: true,
    registrationCount: await countRegistrations(event._id),
  });
});

// Mirror of registerForEvent: one conditional $pull, no counter. Desired-state
// and idempotent — clearing a registration that isn't there succeeds too — so
// repeated or parallel requests can never take the count below the truth.
// Allowed only while registration is open, the same window as registering.
export const unregisterFromEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  if (event.status === "Cancelled") {
    throw new ApiError(400, "This event has been cancelled");
  }
  if (new Date() >= registrationCutoff(event)) {
    throw new ApiError(400, "Registration is closed, so it can no longer be cancelled");
  }

  await User.updateOne(
    { _id: req.user._id, registeredEvents: event._id },
    { $pull: { registeredEvents: event._id } },
  );

  sendResponse(res, 200, "Registration cancelled", {
    isRegistered: false,
    registrationCount: await countRegistrations(event._id),
  });
});

export const getUpcomingEvents = asyncHandler(async (req, res) => {
  const cached = await getJSON(UPCOMING_EVENTS_CACHE_KEY);
  if (cached) {
    return sendResponse(res, 200, "Upcoming and ongoing events fetched", cached);
  }

  const now = new Date();

  const events = await Event.find({
    // Keeps events that are either currently running or haven't started yet
    endDateTime: { $gte: now },
  })
    .populate("organizerClub", "clubName logo")
    .sort({ startDateTime: 1 }) // Keeps the closest events at the top
    .limit(5);

  await setJSON(UPCOMING_EVENTS_CACHE_KEY, events, UPCOMING_EVENTS_TTL);
  sendResponse(res, 200, "Upcoming and ongoing events fetched", events);
});

export const registeredEvents = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("registeredEvents");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  sendResponse(res, 200, "Registered events fetched", user.registeredEvents);
});

// eventManagerMiddleware has already loaded req.event and authorized the user.
export const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = pickEventFields(req.body);

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No updatable fields provided.");
  }

  // Compare against the stored value when only one side is being changed.
  assertEventDates(updates, req.event);

  // Moving an event to another club requires admin rights over that club too.
  if (
    updates.organizerClub !== undefined &&
    String(updates.organizerClub) !== String(req.event.organizerClub)
  ) {
    await assertClubAdmin(req.user, updates.organizerClub);
  }

  const updatedEvent = await Event.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true } // Returns the newly modified object and fires schema validations
  );
  

  if (!updatedEvent) {
    throw new ApiError(404, "Target event configuration does not exist");
  }

  await del(UPCOMING_EVENTS_CACHE_KEY);

  notifyEventRegistrants(updatedEvent._id, req.user._id, {
    type: "event_update",
    title: "Event updated",
    message: `${updatedEvent.eventName} was just updated.`,
    targetType: "event",
    targetId: updatedEvent._id,
    createdBy: req.user._id,
  });

  return sendResponse(res, 200, "Event parameters synced successfully", { event: updatedEvent });
});