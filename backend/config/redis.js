import "dotenv/config";
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
  console.error(`[REDIS ERROR] ${err.message || err.code || err.name}`);
});

let connectPromise = null;
export const connectRedis = () => {
  if (redisClient.isOpen) {
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

export default redisClient;
