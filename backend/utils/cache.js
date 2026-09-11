import redisClient from "../config/redis.js";

export const get = async (key) => {
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error(`[CACHE] GET failed for ${key}: ${err.message}`);
    return null;
  }
};

export const set = async (key, value, ttlSeconds) => {
  try {
    await redisClient.set(key, value, { EX: ttlSeconds });
  } catch (err) {
    console.error(`[CACHE] SET failed for ${key}: ${err.message}`);
  }
};

export const del = async (key) => {
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
