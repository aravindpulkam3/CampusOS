import "dotenv/config";
import { createClient } from "redis";

// Redis is a cache only, never a hard dependency. Every failure mode below
// (URL unset, URL malformed, server down at boot, outage mid-run) leaves the
// app running with caching disabled — utils/cache.js checks isReady.
const RECONNECT_MAX_DELAY_MS = 5000;

const createRedisClient = () => {
  if (!process.env.REDIS_URL) {
    console.warn("[REDIS] REDIS_URL not set: caching disabled");
    return null;
  }

  try {
    return createClient({
      url: process.env.REDIS_URL,
      // Reject commands immediately while disconnected instead of queueing
      // them until a reconnect that may never come — a queued command
      // would hang the request that issued it.
      disableOfflineQueue: true,
      socket: {
        connectTimeout: 5000,
        // Always return a delay (never false/Error) so the client keeps
        // reconnecting in the background. The default strategy gives up
        // permanently after a socket timeout.
        reconnectStrategy: (retries) =>
          Math.min(retries * 500, RECONNECT_MAX_DELAY_MS),
      },
    });
  } catch {
    // Deliberately not echoing the value — it can embed a password.
    console.error("[REDIS] invalid REDIS_URL: caching disabled");
    return null;
  }
};

const redisClient = createRedisClient();

if (redisClient) {
  // Log once per outage, not once per reconnect attempt.
  let outageLogged = false;

  redisClient.on("error", (err) => {
    if (outageLogged) return;
    outageLogged = true;
    console.error(
      `[REDIS] unavailable, serving without cache: ${err.message || err.code || err.name}`
    );
  });

  redisClient.on("ready", () => {
    if (outageLogged) console.log("[REDIS] reconnected, cache re-enabled");
    outageLogged = false;
  });
}

// Never rejects: Redis being down must not fail startup. With the reconnect
// strategy above, connect() keeps retrying instead of rejecting; the catch
// covers anything else (e.g. the client being closed mid-connect).
let connectPromise = null;
export const connectRedis = () => {
  if (!redisClient || redisClient.isOpen) {
    return Promise.resolve();
  }

  if (!connectPromise) {
    connectPromise = redisClient
      .connect()
      .catch((err) => {
        console.error(`[REDIS] Initial connection failed: ${err.message || err.code || err.name}`);
      })
      .finally(() => {
        connectPromise = null;
      });
  }
  return connectPromise;
};

// May be null when caching is disabled.
export default redisClient;
