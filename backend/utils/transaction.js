import mongoose from "mongoose";

// Runs `fn(session)` in a MongoDB transaction; every write inside must pass
// `{ session }`. Throwing inside fn aborts and rolls back everything.
//
// Deliberately has NO non-transactional fallback (unlike
// withOptionalTransaction in services/shortlist.service.js): it guards pairs of
// writes that must never diverge, such as a roster entry and its linked User.
// If the deployment cannot run transactions, the request fails instead.
export const withTransaction = async (fn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

export default withTransaction;
