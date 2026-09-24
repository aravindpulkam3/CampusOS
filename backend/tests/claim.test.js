import { afterEach, describe, expect, it, vi } from "vitest";
import User from "../models/User.js";
import RosterEntry from "../models/RosterEntry.js";
import { PASSWORD, client, makeRosterEntry } from "./helpers.js";

// Requests an activation link for a roster entry and returns its token.
const requestActivation = async (entry) => {
  const res = await client().post("/api/auth/signup").send({ email: entry.email });
  expect(res.status).toBe(200);
  const mail = globalThis.sentMail.findLast((m) => m.type === "claim" && m.to === entry.email);
  expect(mail).toBeDefined();
  return mail.token;
};

const activate = (body) => client().post("/api/auth/verify-email").send(body);

describe("account activation (roster claim)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates exactly one account when two activations race with the same link", async () => {
    const entry = await makeRosterEntry();
    const token = await requestActivation(entry);

    const results = await Promise.all([
      activate({ token, password: PASSWORD }),
      activate({ token, password: PASSWORD }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    const users = await User.find({ email: entry.email });
    expect(users).toHaveLength(1);
    const claimed = await RosterEntry.findById(entry._id);
    expect(String(claimed.claimedBy)).toBe(String(users[0]._id));
  });

  it("saves nothing when a step fails, and the same link works on retry", async () => {
    const entry = await makeRosterEntry();
    const token = await requestActivation(entry);

    // Fail the user insert once, after the token was used and the entry claimed.
    vi.spyOn(User.prototype, "save").mockRejectedValueOnce(new Error("simulated failure"));
    const failed = await activate({ token, password: PASSWORD });
    expect(failed.status).toBe(500);

    expect(await User.countDocuments({ email: entry.email })).toBe(0);
    expect((await RosterEntry.findById(entry._id)).claimedBy).toBeNull();

    const retry = await activate({ token, password: PASSWORD });
    expect(retry.status).toBe(200);
    expect(await User.countDocuments({ email: entry.email })).toBe(1);
  });

  it("takes identity from the roster, ignoring identity fields in the request", async () => {
    const entry = await makeRosterEntry({ branch: "CSE" });
    const token = await requestActivation(entry);

    const res = await activate({
      token,
      password: PASSWORD,
      rollNumber: "FAKE001",
      branch: "EEE",
      role: "superadmin",
    });
    expect(res.status).toBe(200);

    const user = await User.findOne({ email: entry.email });
    expect(user.rollNumber).toBe(entry.rollNumber);
    expect(user.branch).toBe("CSE");
    expect(user.role).toBe("student");
  });
});
