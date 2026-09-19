import mongoose from "mongoose";

// Post-startup connection state changes. The driver reconnects on its own;
// these make an outage visible in the logs. The "error" listener also keeps a
// connection-level error event from going unhandled.
mongoose.connection.on("disconnected", () => console.warn("[MONGO] disconnected"));
mongoose.connection.on("reconnected", () => console.log("[MONGO] reconnected"));
mongoose.connection.on("error", (err) => console.error("[MONGO] connection error:", err.message));

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MONGO] initial connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
