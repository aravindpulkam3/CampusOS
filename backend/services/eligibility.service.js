// Drive eligibility — the single source of truth.
//
// This logic used to exist in five divergent copies (dashboard controller,
// notice controller x2, drive controller's checkEligibility + eligibilityFilter,
// and application controller's inline block), which disagreed with each other in
// ways students could see: the listing endpoints used `user.cgpa || 0` (matching
// only minCGPA-0 drives), the career dashboard used `user.cgpa ?? 10` (the
// opposite lie), and the apply endpoint used a third variant. A drive could be
// advertised as eligible and then rejected on apply.
//
// buildEligibilityFilter (Mongo) and checkDriveEligibility (in-memory) evaluate
// the SAME criteria in the SAME order, so anything the filter returns will pass
// the check. That equivalence is the contract — keep them in step.

// `null` means "not provided", never 0. See getPlacementProfile below.
const hasValue = (v) => v !== null && v !== undefined;

// ─── Mongo query fragment ─────────────────────────────────────────────────────
// Caller MUST have confirmed canEvaluateEligibility first — passing a null cgpa
// here would build `{ $lte: null }`, which matches nothing and would silently
// tell the student they qualify for no drives at all.
export const buildEligibilityFilter = (user) => ({
  minCGPA: { $lte: user.cgpa },
  minYear: { $lte: user.year },
  maxYear: { $gte: user.year },
  // Several independent $or groups — they must live under one $and, because a
  // second bare top-level $or key would silently overwrite the first.
  $and: [
    {
      $or: [
        { eligibleBranches: { $size: 0 } }, // empty ⇒ open to all branches
        { eligibleBranches: user.branch },
      ],
    },
    {
      $or: [
        { batch: null }, // unset ⇒ open to all batches
        { batch: { $exists: false } },
        { batch: user.batch },
      ],
    },
    // Skipped entirely when unknown: an unreported backlog count must never
    // hide an opportunity. The student is prompted to complete their profile.
    ...(hasValue(user.backlogs)
      ? [{ maxBacklogs: { $gte: user.backlogs } }]
      : []),
  ],
});

// ─── In-memory check ──────────────────────────────────────────────────────────
// Same criteria, same order as buildEligibilityFilter. Returns every failing
// reason rather than short-circuiting, so the student sees the full picture.
export const checkDriveEligibility = (drive, user) => {
  const reasons = [];

  if (!hasValue(user.cgpa)) {
    reasons.push("Add your CGPA to your profile to check eligibility");
  } else if (drive.minCGPA > 0 && user.cgpa < drive.minCGPA) {
    reasons.push(`Min CGPA ${drive.minCGPA} required (yours: ${user.cgpa})`);
  }

  if (drive.minYear && user.year < drive.minYear) {
    reasons.push(`Min year ${drive.minYear} required`);
  }
  if (drive.maxYear && user.year > drive.maxYear) {
    reasons.push(`Open to year ${drive.maxYear} and below`);
  }

  if (
    drive.eligibleBranches?.length > 0 &&
    !drive.eligibleBranches.includes(user.branch)
  ) {
    reasons.push(`Open to ${drive.eligibleBranches.join(", ")} only`);
  }

  if (hasValue(drive.batch) && drive.batch !== user.batch) {
    reasons.push(`Open to the ${drive.batch} batch only`);
  }

  // Mirrors the filter: unknown backlogs is not a failure. (The previous code
  // compared against user.backlogs when User had no such field at all, so
  // `undefined > n` was always false and this check never once fired.)
  if (
    hasValue(user.backlogs) &&
    hasValue(drive.maxBacklogs) &&
    user.backlogs > drive.maxBacklogs
  ) {
    reasons.push(
      `Maximum of ${drive.maxBacklogs} backlogs allowed (yours: ${user.backlogs})`,
    );
  }

  return { eligible: reasons.length === 0, reasons };
};

// ─── Placement profile completeness ───────────────────────────────────────────
// Two independent flags, because CGPA and backlogs are treated asymmetrically:
//   - no CGPA  → eligibility cannot be computed at all; show no drives and say so
//   - no backlogs → that one criterion is skipped; drives ARE shown, less precisely
// A single `complete` boolean would conflate those and hide every drive from the
// entire user base on the day `backlogs` was introduced.
export const getPlacementProfile = (user) => {
  const missingFields = [];
  if (!hasValue(user.cgpa)) missingFields.push("cgpa");
  if (!hasValue(user.backlogs)) missingFields.push("backlogs");

  return {
    canEvaluateEligibility: hasValue(user.cgpa),
    placementProfileComplete: missingFields.length === 0,
    missingFields,
  };
};
