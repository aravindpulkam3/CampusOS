import crypto from "crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, inject, vi } from "vitest";

// One fixed test environment for every file. It is set here, before any test
// file imports the app, because config/env.js and the rate limiters read their
// settings once, at import. Optional services are set to empty strings rather
// than left unset, so dotenv can't fill them in from a local backend/.env.
Object.assign(process.env, {
  NODE_ENV: "test",
  MONGO_URI: inject("mongoUri"),
  CLIENT_URL: "http://localhost:5173",
  JWT_ACCESS_SECRET: crypto.randomBytes(48).toString("hex"),
  JWT_REFRESH_SECRET: crypto.randomBytes(48).toString("hex"),
  // The production value. Tests give each simulated client its own IP through
  // X-Forwarded-For, which is trusted only because supertest connects from
  // loopback.
  TRUST_PROXY: "loopback",
  // Small login limits, so the rate-limit tests stay short.
  RATE_LIMIT_LOGIN_MAX: "5",
  RATE_LIMIT_LOGIN_IP_MAX: "10",
  REDIS_URL: "",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
  SMTP_HOST: "",
  SMTP_PORT: "",
  SMTP_USER: "",
  SMTP_PASS: "",
  MAIL_FROM: "",
});

// Emails are captured instead of sent, so tests can read the one-time tokens.
globalThis.sentMail = [];
vi.mock("../utils/mailer.js", () => ({
  sendMail: async () => {},
  sendAccountClaimEmail: async (to, token) => {
    globalThis.sentMail.push({ type: "claim", to, token });
  },
  sendPasswordResetEmail: async (to, token) => {
    globalThis.sentMail.push({ type: "reset", to, token });
  },
}));

// A fresh database per test file. Fixtures use unique emails / roll numbers,
// so tests inside a file don't need to clean up after each other.
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: `test_${crypto.randomUUID()}`,
  });
  // Build every model's indexes (unique, TTL) before any test relies on them.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
