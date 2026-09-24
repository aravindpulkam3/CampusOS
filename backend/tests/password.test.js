import { describe, expect, it } from "vitest";
import Session from "../models/Session.js";
import PasswordReset from "../models/PasswordReset.js";
import { PASSWORD, client, loginAs, makeUser } from "./helpers.js";

const NEW_PASSWORD = "a-brand-new-passphrase-7";

const changePassword = (agent, currentPassword, newPassword) =>
  agent.patch("/api/auth/password").send({ currentPassword, newPassword });

const login = (email, password) =>
  client().post("/api/auth/login").send({ email, password });

// Requests a reset link and returns the emailed token (or undefined if none).
const requestReset = async (email) => {
  const res = await client().post("/api/auth/forgot-password").send({ email });
  const mail = globalThis.sentMail.findLast((m) => m.type === "reset" && m.to === email);
  return { res, token: mail?.token };
};

const resetPassword = (token, password) =>
  client().post("/api/auth/reset-password").send({ token, password });

describe("change password", () => {
  it("refuses a wrong current password", async () => {
    const user = await makeUser();
    const agent = await loginAs(user);
    const res = await changePassword(agent, "not-my-password", NEW_PASSWORD);
    expect(res.status).toBe(400);
  });

  it("refuses the account's email or roll number as the new password", async () => {
    const user = await makeUser();
    const agent = await loginAs(user);
    expect((await changePassword(agent, PASSWORD, user.email)).status).toBe(400);
    expect((await changePassword(agent, PASSWORD, user.rollNumber.toLowerCase())).status).toBe(400);
  });

  it("revokes every refresh session; other devices keep only their current access token", async () => {
    const user = await makeUser();
    const thisDevice = await loginAs(user);
    const otherDevice = await loginAs(user);

    const res = await changePassword(thisDevice, PASSWORD, NEW_PASSWORD);
    expect(res.status).toBe(200);
    expect(await Session.countDocuments({ user: user._id })).toBe(0);

    // Accepted behavior (stateless access tokens): the other device's current
    // access token keeps working until it expires...
    expect((await otherDevice.get("/api/auth/me")).status).toBe(200);
    // ...but it can't refresh, so it must sign in again once that token expires.
    expect((await otherDevice.post("/api/auth/refresh")).status).toBe(401);

    expect((await login(user.email, PASSWORD)).status).toBe(401);
    expect((await login(user.email, NEW_PASSWORD)).status).toBe(200);
  });
});

describe("forgot password", () => {
  it("answers the same for unknown and real accounts, and emails only the real one", async () => {
    const user = await makeUser();
    const unknown = await requestReset("nobody-here@college.edu");
    const real = await requestReset(user.email);

    expect(unknown.res.status).toBe(200);
    expect(real.res.status).toBe(200);
    expect(real.res.body).toEqual(unknown.res.body);
    expect(unknown.token).toBeUndefined();
    expect(real.token).toBeDefined();
  });
});

describe("reset password", () => {
  it("works once", async () => {
    const user = await makeUser();
    const { token } = await requestReset(user.email);

    expect((await resetPassword(token, NEW_PASSWORD)).status).toBe(200);
    expect((await resetPassword(token, "yet-another-passphrase-9")).status).toBe(400);
    expect((await login(user.email, NEW_PASSWORD)).status).toBe(200);
  });

  it("refuses an expired link", async () => {
    const user = await makeUser();
    const { token } = await requestReset(user.email);
    await PasswordReset.updateOne({ user: user._id }, { expiresAt: new Date(Date.now() - 1000) });

    expect((await resetPassword(token, NEW_PASSWORD)).status).toBe(400);
  });

  it("keeps the link usable when the new password is rejected", async () => {
    const user = await makeUser();
    const { token } = await requestReset(user.email);

    expect((await resetPassword(token, user.rollNumber)).status).toBe(400);
    expect((await resetPassword(token, NEW_PASSWORD)).status).toBe(200);
  });

  it("revokes every refresh session", async () => {
    const user = await makeUser();
    const device = await loginAs(user);
    const { token } = await requestReset(user.email);

    expect((await resetPassword(token, NEW_PASSWORD)).status).toBe(200);
    expect(await Session.countDocuments({ user: user._id })).toBe(0);
    expect((await device.post("/api/auth/refresh")).status).toBe(401);
  });
});
