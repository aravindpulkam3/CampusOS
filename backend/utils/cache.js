import redisClient from "../config/redis.js";

// Best-effort: while Redis is unset, down or reconnecting, reads are misses
// and writes/invalidations are skipped, so callers fall through to MongoDB.
// The try/catch blocks cover a disconnect between this check and the command.
const isAvailable = () => Boolean(redisClient?.isReady);

export const get = async (key) => {
  if (!isAvailable()) return null;
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error(`[CACHE] GET failed for ${key}: ${err.message}`);
    return null;
  }
};

export const set = async (key, value, ttlSeconds) => {
  if (!isAvailable()) return;
  try {
    await redisClient.set(key, value, { EX: ttlSeconds });
  } catch (err) {
    console.error(`[CACHE] SET failed for ${key}: ${err.message}`);
  }
};

export const del = async (key) => {
  if (!isAvailable()) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error(`[CACHE] DEL failed for ${key}: ${err.message}`);
  }
};

export const getJSON = async (key) => {
  const raw = await get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[CACHE] Failed to parse cached JSON for ${key}: ${err.message}`);
    return null;
  }
};

export const setJSON = async (key, value, ttlSeconds) => {
  await set(key, JSON.stringify(value), ttlSeconds);
};
