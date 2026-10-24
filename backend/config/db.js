import mongoose from "mongoose";
import { env } from "./env.js";
import logger from "./logger.js";

const log = logger.child({ module: "mongo" });

// Post-startup connection state changes. The driver reconnects on its own;
// these make an outage visible in the logs. The "error" listener also keeps a
// connection-level error event from going unhandled.
mongoose.connection.on("disconnected", () => log.warn("disconnected"));
mongoose.connection.on("reconnected", () => log.info("reconnected"));
mongoose.connection.on("error", (err) => log.error({ err }, "connection error"));

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri);
    log.info({ host: conn.connection.host }, "connected");
  } catch (error) {
    log.fatal({ err: error }, "initial connection failed");
    process.exit(1);
  }
};

export default connectDB;
