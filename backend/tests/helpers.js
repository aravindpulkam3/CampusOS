import request from "supertest";
import app from "../app.js";
import { env } from "../config/env.js";
import User from "../models/User.js";
import RosterEntry from "../models/RosterEntry.js";

export const PASSWORD = "correct-horse-battery-42";

let seq = 0;
const next = () => ++seq;

// Every simulated client gets its own IP (sent as X-Forwarded-For, trusted
// because tests run with TRUST_PROXY=loopback), so rate-limit buckets never
// carry over from one test to another.
export const nextIp = () => {
  const n = next();
  return `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
};

// A supertest agent: keeps cookies between requests, like a browser.
export const client = (ip = nextIp()) =>
  request.agent(app).set("Origin", env.clientUrl).set("X-Forwarded-For", ip);

// An activated account. Saved through the model, so the password is hashed.
export const makeUser = async (overrides = {}) => {
  const n = next();
  const user = new User({
    firstName: "Test",
    lastName: `User${n}`,
    email: `user${n}@college.edu`,
    rollNumber: `ROLL${n}`,
    branch: "CSE",
    batch: 2023,
    section: "A",
    year: 3,
    password: PASSWORD,
    emailVerifiedAt: new Date(),
    ...overrides,
  });
  await user.save();
  return user;
};

export const makeRosterEntry = (overrides = {}) => {
  const n = next();
  return RosterEntry.create({
    rollNumber: `R${n}`,
    email: `student${n}@college.edu`,
    firstName: "Roster",
    lastName: `Student${n}`,
    branch: "CSE",
    batch: 2023,
    section: "A",
    year: 3,
    cgpa: 8,
    backlogs: 0,
    ...overrides,
  });
};

export const loginAs = async (user, password = PASSWORD) => {
  const agent = client();
  const res = await agent.post("/api/auth/login").send({ email: user.email, password });
  if (res.status !== 200) {
    throw new Error(`login failed for ${user.email}: ${res.status} ${res.body.message}`);
  }
  return agent;
};
