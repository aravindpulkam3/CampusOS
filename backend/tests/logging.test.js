import { describe, expect, it, vi } from "vitest";
import { captureLogger } from "./logCapture.js";

// The app's real logger, writing JSON lines into `logs` instead of stdout.
const logs = vi.hoisted(() => []);
vi.mock("../config/logger.js", (importOriginal) => captureLogger(importOriginal, logs));

import logger, { createLogger } from "../config/logger.js";
import Club from "../models/Club.js";
import User from "../models/User.js";
import { client, loginAs, makeUser, PASSWORD } from "./helpers.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// The completion line pino-http wrote for one response.
const requestLines = (res) =>
  logs.filter((line) => line.req?.id === res.headers["x-request-id"]);

describe("HTTP request logging", () => {
  it("logs one line per request: id, method, path, status, duration, user", async () => {
    const user = await makeUser();
    const agent = await loginAs(user);
    const res = await agent.get("/api/clubs?search=private-query");

    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toMatch(UUID);
    const lines = requestLines(res);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: "info",
      req: { method: "GET", url: "/api/clubs" },
      res: { statusCode: 200 },
      user: String(user._id),
    });
    expect(typeof lines[0].responseTime).toBe("number");
    // Whitelisted request fields only: no headers, no query string.
    expect(Object.keys(lines[0].req).sort()).toEqual(["id", "method", "url"]);
    expect(JSON.stringify(lines)).not.toContain("private-query");
  });

  it("never logs passwords, cookies or authorization headers", async () => {
    const user = await makeUser();
    logs.length = 0;
    const agent = client();
    const login = await agent.post("/api/auth/login").send({ email: user.email, password: PASSWORD });
    expect(login.status).toBe(200);
    const cookieValues = login.headers["set-cookie"]
      .map((c) => c.split(";")[0].split("=")[1])
      .filter(Boolean);
    expect(cookieValues.length).toBeGreaterThanOrEqual(2); // access + refresh tokens
    await agent.get("/api/auth/me").set("Authorization", "Bearer header-secret-value");

    const output = JSON.stringify(logs);
    expect(output).not.toContain(PASSWORD);
    expect(output).not.toContain("header-secret-value");
    for (const value of cookieValues) expect(output).not.toContain(value);
    expect(output).not.toContain(user.email);
  });

  it("ignores a client-supplied X-Request-Id", async () => {
    const res = await client().get("/api/nowhere").set("X-Request-Id", "client-chosen-id-123");
    expect(res.headers["x-request-id"]).toMatch(UUID);
    expect(res.headers["x-request-id"]).not.toBe("client-chosen-id-123");
    expect(JSON.stringify(logs)).not.toContain("client-chosen-id-123");
  });
});

describe("error logging through the central handler", () => {
  it("answers an unexpected error with a generic 500 and logs it once, with its stack", async () => {
    const agent = await loginAs(await makeUser());
    vi.spyOn(Club, "find").mockImplementationOnce(() => {
      throw new Error("simulated failure");
    });
    const res = await agent.get("/api/clubs");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, message: "Internal server error." });
    const lines = logs.filter((line) => line.reqId === res.headers["x-request-id"] || line.req?.id === res.headers["x-request-id"]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: "error",
      res: { statusCode: 500 },
      err: { type: "Error", message: "simulated failure" },
    });
    expect(lines[0].err.stack).toContain("simulated failure");
  });

  it("keeps the 404 body and logs it as a warning without an error", async () => {
    const res = await client().get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Route GET /api/does-not-exist not found." });
    const [line] = requestLines(res);
    expect(line).toMatchObject({ level: "warn", res: { statusCode: 404 } });
    expect(line.err).toBeUndefined();
  });

  it("keeps a validation 400 a warning without an error", async () => {
    const agent = await loginAs(await makeUser());
    const res = await agent.patch("/api/auth/password").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const [line] = requestLines(res);
    expect(line).toMatchObject({ level: "warn", res: { statusCode: 400 } });
    expect(line.err).toBeUndefined();
  });

  it("answers malformed JSON with its fixed message and never logs the body", async () => {
    const res = await client()
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": "x", "password": "malformed-secret"');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: "Malformed JSON request body." });
    expect(JSON.stringify(requestLines(res))).not.toContain("malformed-secret");
  });
});

describe("logger redaction and error serialization", () => {
  const capture = () => {
    const lines = [];
    const log = createLogger({ write: (line) => lines.push(JSON.parse(line)) });
    log.level = "debug";
    return { log, lines };
  };

  it("censors credentials at the top level and one or two levels down", () => {
    const { log, lines } = capture();
    log.info({
      password: "s1",
      token: "s2",
      body: { password: "s3", refreshToken: "s4" },
      req: { headers: { cookie: "s5", authorization: "s6" } },
    });
    const output = JSON.stringify(lines);
    for (const secret of ["s1", "s2", "s3", "s4", "s5", "s6"]) {
      expect(output).not.toContain(`"${secret}"`);
    }
    expect(lines[0].body.password).toBe("[redacted]");
    expect(lines[0].req.headers.cookie).toBe("[redacted]");
  });

  it("drops the duplicated values from a real MongoDB duplicate-key error", async () => {
    const user = await makeUser();
    const err = await User.create({
      firstName: "Dup", lastName: "User", email: user.email, rollNumber: "DUP1",
      branch: "CSE", batch: 2023, section: "A", year: 3, password: PASSWORD,
    }).catch((e) => e);
    expect(err.code).toBe(11000);
    expect(String(err.message)).toContain(user.email); // what the scrub is for

    const { log, lines } = capture();
    log.error({ err }, "insert failed");
    expect(JSON.stringify(lines)).not.toContain(user.email);
    expect(lines[0].err).toMatchObject({ type: "MongoServerError", code: 11000 });
    expect(lines[0].err.keyValue).toBeUndefined();
    expect(lines[0].err.message).toContain("dup key: { [redacted] }");
  });

  it("logs non-Error rejection reasons without crashing", () => {
    const { log, lines } = capture();
    log.fatal({ err: "plain string reason" }, "unhandledRejection");
    expect(lines[0].err).toEqual({ message: "plain string reason" });
  });

  it("is silent by default in tests", () => {
    // The capture above replaced the module's default export; the real one is
    // built from env.logLevel, which defaults to silent under NODE_ENV=test.
    expect(createLogger().level).toBe("silent");
    expect(logger.level).toBe("debug");
  });
});
