import { beforeAll, describe, expect, it } from "vitest";
import app from "../app.js";
import { env } from "../config/env.js";
import { PASSWORD, client, makeUser } from "./helpers.js";

const login = (agent, email, password) =>
  agent.post("/api/auth/login").send({ email, password });

describe("login rate limits", () => {
  beforeAll(() => {
    // Guard: these tests only mean something with the small limits from
    // tests/setup.js, not the production defaults.
    expect(env.rateLimits.loginMax).toBe(5);
    expect(env.rateLimits.loginIpMax).toBe(10);
  });

  it("limits failed logins per email, even when they come from different IPs", async () => {
    const user = await makeUser();
    for (let i = 0; i < env.rateLimits.loginMax; i++) {
      const res = await login(client(), user.email, "wrong-password");
      expect(res.status).toBe(401);
    }
    const blocked = await login(client(), user.email, PASSWORD);
    expect(blocked.status).toBe(429);
  });

  it("limits failed logins per IP, across different emails", async () => {
    const agent = client(); // one IP
    for (let i = 0; i < env.rateLimits.loginIpMax; i++) {
      const res = await login(agent, `nobody${i}@college.edu`, "wrong-password");
      expect(res.status).toBe(401);
    }
    const blocked = await login(agent, "someone-else@college.edu", "wrong-password");
    expect(blocked.status).toBe(429);
  });

  it("does not count successful logins", async () => {
    const user = await makeUser();
    const agent = client();
    for (let i = 0; i < env.rateLimits.loginMax + 1; i++) {
      expect((await login(agent, user.email, PASSWORD)).status).toBe(200);
    }
    // Still allowed to fail: the successes above used none of the budget.
    expect((await login(agent, user.email, "wrong-password")).status).toBe(401);
  });

  it("rejects an object as the email without turning it into a limiter key", async () => {
    // More attempts than the per-email limit, each from a fresh IP: if the
    // object became a shared key, the last ones would get 429 instead of 400.
    for (let i = 0; i < env.rateLimits.loginMax + 2; i++) {
      const res = await login(client(), { $ne: null }, "wrong-password");
      expect(res.status).toBe(400);
    }
  });
});

describe("trusted proxy", () => {
  it("trusts X-Forwarded-For only from loopback (Nginx on the same machine)", () => {
    const trust = app.get("trust proxy fn");
    expect(trust("127.0.0.1", 0)).toBe(true);
    expect(trust("203.0.113.9", 0)).toBe(false);
  });
});
