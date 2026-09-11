// Derives a round's display state from its position relative to
// drive.currentRoundId plus its own timestamps — never stored in Mongo.
//
// A round strictly after the current round is always "upcoming", no matter
// its own startDate: the applicant cohort hasn't reached it yet, so it can
// never read as "ongoing" on its own. A round strictly before the current
// round is always "processed" (advanceRound only ever leaves a round once
// it has been ended + processed). Only the current round's state is derived
// from its own {startDate, endedAt, processedAt}.
const deriveRoundStates = (rounds, currentRoundId) => {
  const currentIndex = currentRoundId
    ? rounds.findIndex((r) => String(r._id) === String(currentRoundId))
    : -1;

  const now = new Date();

  return rounds.map((round, index) => {
    let derivedState;

    if (currentIndex === -1) {
      derivedState = "upcoming";
    } else if (index > currentIndex) {
      derivedState = "upcoming";
    } else if (index < currentIndex) {
      derivedState = "processed";
    } else if (round.processedAt) {
      derivedState = "processed";
    } else if (round.endedAt) {
      derivedState = "ended_awaiting";
    } else if (round.startDate && now >= new Date(round.startDate)) {
      derivedState = "ongoing";
    } else {
      derivedState = "upcoming";
    }

    const plain = round.toObject ? round.toObject() : round;
    return { ...plain, derivedState };
  });
};

// Which rounds a still-participating applicant may be shown SCHEDULES for.
//
// Round progression is implicit here — there is no per-round result array on
// Application. Survivors of a shortlist keep status "active" (only the rejected
// are flipped), so "this round has been processed AND I'm still active" is the
// only reliable signal that a student got through it.
//
// Callers MUST also gate on Application.status === "active" (eliminated students
// see nothing) and Drive.status === "active" (cancelDrive does not cascade to
// applications, so a cancelled drive's applicants stay "active" indefinitely).
export const getReachableRoundIndexes = (rounds, currentRoundId) => {
  // No rounds defined yet — nothing to show. Returning [0] here would hand the
  // caller an index into an empty array.
  if (!rounds?.length) return [];

  // Common and legitimate: addRound never sets currentRoundId, only advanceRound
  // does, so every drive sits here between round creation and the first advance.
  if (!currentRoundId) return [0];

  const i = rounds.findIndex((r) => String(r._id) === String(currentRoundId));

  // Inconsistent data (round deleted out from under the pointer, or a bad write).
  // Falling back to [0] would show round 1 to a cohort that may be at round 3 —
  // a wrong-schedule bug dressed up as resilience. Show nothing instead.
  if (i === -1) return [];

  // Cut still pending: any later round is speculative, and this student may yet
  // be eliminated from it.
  if (!rounds[i].processedAt) return [i];

  // Cut applied and the caller has confirmed the student is still active ⇒ they
  // survived, so the next round is genuinely theirs — worth showing even before
  // the coordinator runs advanceRound. Guard the final round.
  return i + 1 < rounds.length ? [i, i + 1] : [i];
};

export default deriveRoundStates;
