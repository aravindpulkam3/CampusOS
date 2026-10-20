import redisClient from "../config/redis.js";
import { env } from "../config/env.js";

// Best-effort: isReady bypasses Redis while unset/down/reconnecting; callers
// then read MongoDB. disableOfflineQueue is a separate guard for disconnects
// between the readiness check and a command.
const isAvailable = () => Boolean(redisClient?.isReady);

// Only fixed family names enter logs/metrics. In particular, search queries
// and classroom IDs in keys must never be logged as user data.
const FAMILIES = new Set(["clubs", "events", "search", "classroom", "notices", "drives"]);
const familyOf = (key) => {
  const family = typeof key === "string" ? key.split(":")[1] : null;
  return FAMILIES.has(family) ? family : "other";
};
const metrics = new Map();
let activitySinceReport = false;
const count = (key, field) => {
  const family = familyOf(key);
  if (!metrics.has(family)) {
    metrics.set(family, {
      hit: 0, miss: 0, bypass: 0, getError: 0,
      setError: 0, delError: 0, parseError: 0, serializeError: 0,
    });
  }
  metrics.get(family)[field] += 1;
  activitySinceReport = true;
};

export const getCacheMetrics = () =>
  Object.fromEntries([...metrics].map(([family, values]) => [family, { ...values }]));

// Existing console logging, aggregated instead of logging each hit. These are
// per-process cumulative counters; report only when activity occurred.
const reportIntervalMs = env.isDevelopment ? 60_000 : env.isProduction ? 300_000 : 0;
if (reportIntervalMs) {
  setInterval(() => {
    if (!activitySinceReport) return;
    console.log(`[CACHE] metrics ${JSON.stringify(getCacheMetrics())}`);
    activitySinceReport = false;
  }, reportIntervalMs).unref();
}

const errorType = (err) =>
  String(err?.code || err?.name || "Error").replace(/[^A-Za-z0-9_]/g, "").slice(0, 40) || "Error";
const read = async (key) => {
  if (!isAvailable()) {
    count(key, "bypass");
    return { status: "bypass", value: null };
  }
  try {
    const value = await redisClient.get(key);
    return { status: value === null ? "miss" : "hit", value };
  } catch (err) {
    count(key, "getError");
    console.error(`[CACHE] GET failed family=${familyOf(key)} type=${errorType(err)}`);
    return { status: "error", value: null };
  }
};

export const get = async (key) => {
  const { status, value } = await read(key);
  if (status === "hit" || status === "miss") count(key, status);
  return value;
};

export const set = async (key, value, ttlSeconds) => {
  if (!isAvailable()) {
    count(key, "bypass");
    return;
  }
  try {
    await redisClient.set(key, value, { EX: ttlSeconds });
  } catch (err) {
    count(key, "setError");
    console.error(`[CACHE] SET failed family=${familyOf(key)} type=${errorType(err)}`);
  }
};

export const del = async (key) => {
  if (!isAvailable()) {
    count(key, "bypass");
    return;
  }
  try {
    await redisClient.del(key);
  } catch (err) {
    count(key, "delError");
    console.error(`[CACHE] DEL failed family=${familyOf(key)} type=${errorType(err)}`);
  }
};

export const getJSON = async (key) => {
  const { status, value } = await read(key);
  if (status !== "hit") {
    if (status === "miss") count(key, "miss");
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    count(key, "hit");
    return parsed;
  } catch (err) {
    count(key, "parseError");
    count(key, "miss");
    console.error(`[CACHE] JSON parse failed family=${familyOf(key)} type=${errorType(err)}; deleting entry`);
    await del(key); // exact corrupted key; DEL failure is logged and swallowed
    return null;
  }
};

export const setJSON = async (key, value, ttlSeconds) => {
  try {
    await set(key, JSON.stringify(value), ttlSeconds);
  } catch (err) {
    count(key, "serializeError");
    console.error(`[CACHE] JSON serialize failed family=${familyOf(key)} type=${errorType(err)}`);
  }
};
