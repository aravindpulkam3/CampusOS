import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ clients: [] }));
vi.mock("../config/env.js", () => ({
  env: { redisUrl: "redis://localhost:6379", logLevel: "silent" },
}));
vi.mock("redis", () => ({
  createClient: () => {
    let open = false;
    let ready = false;
    let resolveConnection;
    let rejectConnection;
    const client = {
      get isOpen() { return open; },
      get isReady() { return ready; },
      on: vi.fn(),
      connect: vi.fn(() => {
        open = true;
        return new Promise((resolve, reject) => {
          resolveConnection = resolve;
          rejectConnection = reject;
        });
      }),
      destroy: vi.fn(() => {
        open = false;
        ready = false;
        rejectConnection?.(new Error("closed"));
      }),
      finish: () => {
        ready = true;
        resolveConnection?.();
      },
    };
    state.clients.push(client);
    return client;
  },
}));

beforeEach(() => {
  vi.resetModules();
  state.clients.length = 0;
});

describe("Redis connection policy", () => {
  it("keeps the server's default connection unbounded", async () => {
    const { connectRedis } = await import("../config/redis.js");
    const client = state.clients[0];
    const connecting = connectRedis();
    expect(client.connect).toHaveBeenCalledOnce();
    client.finish();
    expect(await connecting).toBe(true);
    expect(client.destroy).not.toHaveBeenCalled();
  });

  it("stops retries after a script opts into a bounded wait", async () => {
    const { connectRedis } = await import("../config/redis.js");
    const client = state.clients[0];
    expect(await connectRedis({ timeoutMs: 25 })).toBe(false);
    expect(client.destroy).toHaveBeenCalledOnce();
    expect(client.isOpen).toBe(false);
  });
});
