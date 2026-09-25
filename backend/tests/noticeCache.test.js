import { beforeEach, describe, expect, it, vi } from "vitest";
import Classroom from "../models/Classroom.js";
import Curriculum from "../models/Curriculum.js";
import Notice from "../models/Notice.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { loginAs, makeUser } from "./helpers.js";

const cacheStore = vi.hoisted(() => new Map());
const socketEvents = vi.hoisted(() => []);
const cacheOffline = vi.hoisted(() => ({ value: false }));
vi.mock("../utils/cache.js", () => ({
  getJSON: async (key) =>
    !cacheOffline.value && cacheStore.has(key)
      ? JSON.parse(JSON.stringify(cacheStore.get(key).value)) : null,
  setJSON: async (key, value, ttl) => {
    if (!cacheOffline.value) {
      cacheStore.set(key, { value: JSON.parse(JSON.stringify(value)), ttl });
    }
  },
  del: async (key) => {
    if (!cacheOffline.value) cacheStore.delete(key);
  },
}));
vi.mock("../sockets/socketHandler.js", () => ({
  getIO: () => ({
    to: (room) => ({
      emit: (event, notification) => socketEvents.push({ room, event, notification }),
    }),
  }),
}));

beforeEach(() => {
  cacheStore.clear();
  socketEvents.length = 0;
  cacheOffline.value = false;
});

describe("classroom notice cache", () => {
  it("invalidates only the affected classroom and keeps notifications and platform reads live", async () => {
    const [classA, classB] = await Classroom.create([
      { branch: "CSE", batch: 2023, section: "A", currentSemesterNumber: 1 },
      { branch: "CSE", batch: 2023, section: "B", currentSemesterNumber: 1 },
    ]);
    const repA = await makeUser({ classroom: classA._id });
    const studentA = await makeUser({ classroom: classA._id });
    const repB = await makeUser({ classroom: classB._id, section: "B" });
    const studentB = await makeUser({ classroom: classB._id, section: "B" });
    const admin = await makeUser({ role: "superadmin" });
    await Classroom.updateOne({ _id: classA._id }, { classRepresentative: repA._id });
    await Classroom.updateOne({ _id: classB._id }, { classRepresentative: repB._id });

    const repClient = await loginAs(repA);
    const studentClient = await loginAs(studentA);
    const otherClient = await loginAs(studentB);
    const adminClient = await loginAs(admin);
    const keyA = `cache:notices:classroom:${classA._id}`;
    const keyB = `cache:notices:classroom:${classB._id}`;
    const listA = () => studentClient.get("/api/notices")
      .query({ targetType: "classroom", targetId: String(classA._id) });
    const listB = () => otherClient.get("/api/notices")
      .query({ targetType: "classroom", targetId: String(classB._id) });

    expect((await listA()).body.data.notices).toEqual([]);
    expect((await listB()).body.data.notices).toEqual([]);
    expect(cacheStore.has(keyA)).toBe(true);
    expect(cacheStore.has(keyB)).toBe(true);

    const posted = await repClient.post("/api/notices").send({
      title: "Lab moved",
      content: "Room 204",
      targetType: "classroom",
      targetId: String(classA._id),
      scopeToCurrentSemester: true,
    });
    expect(posted.status).toBe(201);
    expect(cacheStore.has(keyA)).toBe(false);
    expect(cacheStore.has(keyB)).toBe(true);
    const first = await listA();
    const hit = await listA();
    expect(first.body.data).toEqual(hit.body.data);
    expect(hit.body.data.notices.map((notice) => notice.title)).toEqual(["Lab moved"]);
    expect(cacheStore.get(keyA).value[0].createdBy).toBe(String(repA._id));
    const denied = await otherClient.get("/api/notices")
      .query({ targetType: "classroom", targetId: String(classA._id) });
    expect(denied.status).toBe(403);
    await User.updateOne({ _id: repA._id }, { $set: { firstName: "Updated" } });
    expect((await listA()).body.data.notices[0].createdBy.firstName).toBe("Updated");
    await vi.waitFor(() => {
      expect(socketEvents.some(({ room, event }) =>
        room === `user:${studentA._id}` && event === "notification:new")).toBe(true);
    });
    expect(await Notification.exists({ recipient: studentA._id, type: "classroom_notice" }))
      .toBeTruthy();

    const noticeId = posted.body.data._id;
    expect((await repClient.patch(`/api/notices/${noticeId}/pin`)).status).toBe(200);
    expect(cacheStore.has(keyA)).toBe(false);
    expect(cacheStore.has(keyB)).toBe(true);
    expect((await listA()).body.data.notices[0].isPinned).toBe(true);

    expect((await repClient.patch(`/api/notices/${noticeId}/archive`)).status).toBe(200);
    expect(cacheStore.has(keyA)).toBe(false);
    expect((await listA()).body.data.notices).toEqual([]);

    expect((await repClient.delete(`/api/notices/${noticeId}`)).status).toBe(200);
    expect(cacheStore.has(keyA)).toBe(false);
    expect(cacheStore.has(keyB)).toBe(true);

    // A Redis outage makes reads fall back to Mongo even when an older key
    // exists and deletion cannot reach Redis.
    expect((await listA()).body.data.notices).toEqual([]);
    cacheOffline.value = true;
    const duringOutage = await repClient.post("/api/notices").send({
      title: "During outage", content: "Fresh from Mongo", targetType: "classroom",
      targetId: String(classA._id),
    });
    expect(duringOutage.status).toBe(201);
    expect((await listA()).body.data.notices.map((notice) => notice.title))
      .toContain("During outage");
    cacheOffline.value = false;

    const platformPost = await adminClient.post("/api/notices").send({
      title: "Campus update",
      content: "New announcement",
      targetType: "platform",
    });
    expect(platformPost.status).toBe(201);
    expect(cacheStore.has("cache:notices:platform")).toBe(false);
    const platformList = await adminClient.get("/api/notices")
      .query({ targetType: "platform" });
    expect(platformList.body.data.notices.some((notice) =>
      notice._id === platformPost.body.data._id)).toBe(true);
    await vi.waitFor(() => {
      expect(socketEvents.some(({ room, event, notification }) =>
        room === `user:${studentA._id}` && event === "notification:new" &&
        notification.type === "platform_notice")).toBe(true);
    });
    const dashboard = await studentClient.get("/api/dashboard");
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.notices.some((notice) =>
      notice.title === "Campus update")).toBe(true);
  });

  it("drops the key on semester change and reloads when a cached notice expires", async () => {
    const admin = await makeUser({ role: "superadmin" });
    const rep = await makeUser();
    const firstCurriculum = await Curriculum.create({
      branch: "ECE", semesterNumber: 1, subjects: [], createdBy: admin._id,
    });
    await Curriculum.create({
      branch: "ECE", semesterNumber: 2, subjects: [], createdBy: admin._id,
    });
    const classroom = await Classroom.create({
      branch: "ECE", batch: 2024, section: "A",
      classRepresentative: rep._id,
      currentSemesterNumber: 1,
      curriculum: firstCurriculum._id,
    });
    rep.classroom = classroom._id;
    await rep.save();
    const repClient = await loginAs(rep);
    const key = `cache:notices:classroom:${classroom._id}`;
    const list = () => repClient.get("/api/notices")
      .query({ targetType: "classroom", targetId: String(classroom._id) });
    const post = (title, extra = {}) => repClient.post("/api/notices").send({
      title, content: title, targetType: "classroom",
      targetId: String(classroom._id), ...extra,
    });

    expect((await post("Semester one", { scopeToCurrentSemester: true })).status).toBe(201);
    expect((await post("General")).status).toBe(201);
    const beforeAdvance = (await list()).body.data.notices.map((notice) => notice.title);
    expect(beforeAdvance).toEqual(["General", "Semester one"]);
    expect((await list()).body.data.notices.map((notice) => notice.title))
      .toEqual(beforeAdvance);
    expect(cacheStore.has(key)).toBe(true);
    const advanced = await repClient.post(`/api/classroom/${classroom._id}/semester/next`);
    expect(advanced.status).toBe(200);
    expect(cacheStore.has(key)).toBe(false);
    expect((await list()).body.data.notices.map((notice) => notice.title)).toEqual(["General"]);

    const expiring = await post("Short lived", {
      expiresAt: new Date(Date.now() + 2_800).toISOString(),
    });
    expect(expiring.status).toBe(201);
    expect((await list()).body.data.notices.map((notice) => notice.title))
      .toContain("Short lived");
    expect(cacheStore.get(key).ttl).toBeLessThanOrEqual(2);
    // The mock deliberately retains the entry past its TTL to exercise the
    // read-time expiry guard as well as the TTL calculation.
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    expect((await list()).body.data.notices.map((notice) => notice.title))
      .toEqual(["General"]);
  });
});
