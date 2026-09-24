import { describe, expect, it } from "vitest";
import Session from "../models/Session.js";
import { PASSWORD, client, makeUser } from "./helpers.js";

// The "refreshToken=<jwt>" pair from a response's Set-Cookie headers (skipping
// the Set-Cookie that clears the legacy cookie path).
const refreshCookie = (res) =>
  res.headers["set-cookie"]
    ?.find((c) => c.startsWith("refreshToken=") && !c.startsWith("refreshToken=;"))
    ?.split(";")[0];

const loginDevice = async (user) => {
  const agent = client();
  const res = await agent.post("/api/auth/login").send({ email: user.email, password: PASSWORD });
  expect(res.status).toBe(200);
  return { agent, cookie: refreshCookie(res) };
};

// Presents a specific refresh token, as a thief replaying a copied cookie would.
const refreshWith = (cookie) => client().post("/api/auth/refresh").set("Cookie", cookie);

describe("refresh sessions", () => {
  it("rotates the refresh token on every refresh", async () => {
    const { cookie } = await loginDevice(await makeUser());

    const res = await refreshWith(cookie);
    expect(res.status).toBe(200);
    const rotated = refreshCookie(res);
    expect(rotated).toBeDefined();
    expect(rotated).not.toBe(cookie);
  });

  it("treats a reused refresh token as theft and ends that session", async () => {
    const user = await makeUser();
    const { cookie: first } = await loginDevice(user);
    const second = refreshCookie(await refreshWith(first));

    expect((await refreshWith(first)).status).toBe(401); // replay of the old token
    expect(await Session.countDocuments({ user: user._id })).toBe(0);
    expect((await refreshWith(second)).status).toBe(401); // the current token died with it
  });

  it("revokes the session on logout", async () => {
    const user = await makeUser();
    const { agent, cookie } = await loginDevice(user);

    expect((await agent.post("/api/auth/logout")).status).toBe(200);
    expect(await Session.countDocuments({ user: user._id })).toBe(0);
    expect((await refreshWith(cookie)).status).toBe(401);
  });

  it("revokes every session on logout from all devices", async () => {
    const user = await makeUser();
    const one = await loginDevice(user);
    const two = await loginDevice(user);
    expect(await Session.countDocuments({ user: user._id })).toBe(2);

    expect((await one.agent.post("/api/auth/logout-all")).status).toBe(200);
    expect(await Session.countDocuments({ user: user._id })).toBe(0);
    expect((await refreshWith(two.cookie)).status).toBe(401);
  });
});
