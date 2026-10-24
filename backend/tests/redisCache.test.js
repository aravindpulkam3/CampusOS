import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureLogger } from "./logCapture.js";

// Cache failures are logged; the test reads the real JSON lines.
const logs = vi.hoisted(() => []);
vi.mock("../config/logger.js", (importOriginal) => captureLogger(importOriginal, logs));

const cacheState = vi.hoisted(() => ({ ready: true, store: new Map() }));
vi.mock("../config/redis.js", () => ({
  default: {
    get isReady() { return cacheState.ready; },
    get: vi.fn(async (key) => cacheState.store.has(key) ? cacheState.store.get(key) : null),
    set: vi.fn(async (key, value) => {
      cacheState.store.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (key) => Number(cacheState.store.delete(key))),
  },
}));

import redisClient from "../config/redis.js";
import { del, getCacheMetrics, getJSON, setJSON } from "../utils/cache.js";
import Club from "../models/Club.js";
import { loginAs, makeUser } from "./helpers.js";

const key = "cache:clubs:active";
const stats = () => getCacheMetrics().clubs ?? {};

beforeEach(() => {
  cacheState.ready = true;
  cacheState.store.clear();
  vi.clearAllMocks();
});

describe("Redis JSON cache helper", () => {
  it("counts a miss, stores JSON with TTL, then returns a valid hit", async () => {
    const before = { ...stats() };
    expect(await getJSON(key)).toBeNull();
    await setJSON(key, [{ clubName: "Robotics" }], 60);
    expect(redisClient.set).toHaveBeenCalledWith(
      key, '[{"clubName":"Robotics"}]', { EX: 60 },
    );
    expect(await getJSON(key)).toEqual([{ clubName: "Robotics" }]);
    expect(stats().miss - (before.miss ?? 0)).toBe(1);
    expect(stats().hit - (before.hit ?? 0)).toBe(1);
  });

  it("deletes only malformed JSON and lets the caller refill from the DB", async () => {
    const otherKey = "cache:clubs:popular:active";
    cacheState.store.set(key, "{bad json");
    cacheState.store.set(otherKey, "[]");
    const before = { ...stats() };
    expect(await getJSON(key)).toBeNull();
    expect(redisClient.del).toHaveBeenCalledWith(key);
    expect(cacheState.store.has(key)).toBe(false);
    expect(cacheState.store.get(otherKey)).toBe("[]");
    expect(stats().parseError - (before.parseError ?? 0)).toBe(1);
    expect(stats().miss - (before.miss ?? 0)).toBe(1);

    // This is the controller's ordinary MongoDB-result -> SET path after null.
    await setJSON(key, [{ clubName: "Fresh from MongoDB" }], 120);
    expect(await getJSON(key)).toEqual([{ clubName: "Fresh from MongoDB" }]);
  });

  it("continues as a miss even when deleting the malformed key fails", async () => {
    cacheState.store.set(key, "{bad json");
    redisClient.del.mockRejectedValueOnce(new Error("unavailable"));
    const before = { ...stats() };
    expect(await getJSON(key)).toBeNull();
    expect(stats().delError - (before.delError ?? 0)).toBe(1);
    expect(cacheState.store.has(key)).toBe(true);
  });

  it("does not fail a request when a value cannot be JSON serialized", async () => {
    const circular = {};
    circular.self = circular;
    const before = { ...stats() };
    await expect(setJSON(key, circular, 60)).resolves.toBeUndefined();
    expect(redisClient.set).not.toHaveBeenCalled();
    expect(stats().serializeError - (before.serializeError ?? 0)).toBe(1);
  });

  it("logs the cache family without exposing search text or cached payload", async () => {
    const searchKey = "cache:search:v2:private query";
    cacheState.store.set(searchKey, "private malformed payload");
    logs.length = 0;
    expect(await getJSON(searchKey)).toBeNull();
    const failure = logs.find((line) => line.module === "cache" && line.level === "error");
    expect(failure).toMatchObject({ family: "search", msg: "JSON parse failed; deleting entry" });
    const output = JSON.stringify(logs);
    expect(output).not.toContain("private query");
    expect(output).not.toContain("private malformed payload");
  });

  it("serves an API read from MongoDB after corrupted JSON, then uses the refill", async () => {
    const club = await Club.create({
      clubName: "Cache Recovery Club", description: "A cached listing test",
      category: "Technical", isActive: true,
    });
    const agent = await loginAs(await makeUser());
    cacheState.store.set(key, "{broken");
    const first = await agent.get("/api/clubs");
    expect(first.status).toBe(200);
    expect(first.body.data.some((row) => row._id === String(club._id))).toBe(true);
    expect(redisClient.del).toHaveBeenCalledWith(key);
    expect(JSON.parse(cacheState.store.get(key))).toEqual(first.body.data);

    const second = await agent.get("/api/clubs");
    expect(second.status).toBe(200);
    expect(second.body.data).toEqual(first.body.data);
  });

  it("serves the club endpoint from MongoDB when Redis is not ready", async () => {
    const club = await Club.create({
      clubName: "Offline Cache Club", description: "A bypass test",
      category: "Technical", isActive: true,
    });
    const agent = await loginAs(await makeUser());
    cacheState.ready = false;
    const response = await agent.get("/api/clubs");
    expect(response.status).toBe(200);
    expect(response.body.data.some((row) => row._id === String(club._id))).toBe(true);
    expect(redisClient.get).not.toHaveBeenCalled();
    expect(redisClient.set).not.toHaveBeenCalled();
  });

  it("bypasses Redis while not ready and records operation errors", async () => {
    const before = { ...stats() };
    cacheState.ready = false;
    expect(await getJSON(key)).toBeNull();
    await setJSON(key, [], 60);
    await del(key);
    expect(redisClient.get).not.toHaveBeenCalled();
    expect(redisClient.set).not.toHaveBeenCalled();
    expect(redisClient.del).not.toHaveBeenCalled();
    expect(stats().bypass - (before.bypass ?? 0)).toBe(3);

    cacheState.ready = true;
    redisClient.get.mockRejectedValueOnce(new Error("unavailable"));
    redisClient.set.mockRejectedValueOnce(new Error("unavailable"));
    redisClient.del.mockRejectedValueOnce(new Error("unavailable"));
    expect(await getJSON(key)).toBeNull();
    await setJSON(key, [], 60);
    await del(key);
    expect(stats().getError - (before.getError ?? 0)).toBe(1);
    expect(stats().setError - (before.setError ?? 0)).toBe(1);
    expect(stats().delError - (before.delError ?? 0)).toBe(1);
  });
});
