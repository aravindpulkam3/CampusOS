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

export default deriveRoundStates;
