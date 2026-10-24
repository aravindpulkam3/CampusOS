import { createClient } from "redis";
import { env } from "./env.js";
import logger from "./logger.js";

// Redis is a cache only, never a hard dependency. Every failure mode below
// (URL unset, URL malformed, server down at boot, outage mid-run) leaves the
// app running with caching disabled — utils/cache.js checks isReady.
const RECONNECT_MAX_DELAY_MS = 5000;
const log = logger.child({ module: "redis" });
// Only the error code/name is logged, never the error: its message can echo
// the connection URL, which can embed a password.
const errorType = (err) =>
  String(err?.code || err?.name || "Error").replace(/[^A-Za-z0-9_]/g, "").slice(0, 40) || "Error";

const createRedisClient = () => {
  if (!env.redisUrl) {
    log.warn("REDIS_URL not set: caching disabled");
    return null;
  }

  try {
    return createClient({
      url: env.redisUrl,
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
    log.error("invalid REDIS_URL: caching disabled");
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
    log.error({ type: errorType(err) }, "unavailable, serving without cache");
  });

  redisClient.on("ready", () => {
    if (outageLogged) log.info("reconnected, cache re-enabled");
    outageLogged = false;
  });
}

// The HTTP server calls this without a timeout: Redis reconnects in the
// background and never gates startup. One-off scripts may opt into a bounded
// wait; on timeout their process-local client is destroyed to stop retries.
let connectPromise = null;
export const connectRedis = ({ timeoutMs } = {}) => {
  if (!redisClient) return Promise.resolve(false);
  if (redisClient.isReady) return Promise.resolve(true);

  if (!connectPromise && !redisClient.isOpen) {
    connectPromise = redisClient
      .connect()
      .then(() => true)
      .catch((err) => {
        log.error({ type: errorType(err) }, "initial connection failed");
        return false;
      })
      .finally(() => {
        connectPromise = null;
      });
  }
  if (!connectPromise) return Promise.resolve(redisClient.isReady);
  if (timeoutMs === undefined) return connectPromise;

  const pending = connectPromise;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (redisClient.isReady) return resolve(true);
      log.warn({ timeoutMs }, "connection not ready; stopping script attempt");
      try {
        if (redisClient.isOpen) redisClient.destroy();
      } catch (err) {
        log.warn({ type: errorType(err) }, "failed to stop connection attempt");
      }
      resolve(false);
    }, timeoutMs);
    pending.then((connected) => {
      clearTimeout(timer);
      resolve(connected);
    });
  });
};

// May be null when caching is disabled.
export default redisClient;
