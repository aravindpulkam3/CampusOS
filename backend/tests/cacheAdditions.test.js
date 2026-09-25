import { beforeEach, describe, expect, it, vi } from "vitest";
import Application from "../models/Application.js";
import Classroom from "../models/Classroom.js";
import Curriculum from "../models/Curriculum.js";
import Drive from "../models/Drive.js";
import User from "../models/User.js";
import { loginAs, makeUser } from "./helpers.js";

const cacheStore = vi.hoisted(() => new Map());
vi.mock("../utils/cache.js", () => ({
  getJSON: async (key) =>
    cacheStore.has(key) ? JSON.parse(JSON.stringify(cacheStore.get(key))) : null,
  setJSON: async (key, value) => {
    cacheStore.set(key, JSON.parse(JSON.stringify(value)));
  },
  del: async (key) => {
    cacheStore.delete(key);
  },
}));

beforeEach(() => cacheStore.clear());

describe("shared read caches", () => {
  it("keeps the drive list response shape and application state current on a catalogue hit", async () => {
    const student = await makeUser({ cgpa: 8, backlogs: 0 });
    const coordinator = await makeUser({ role: "placementCoordinator" });
    const drive = await Drive.create({
      companyName: "Acme Systems",
      role: "Engineer",
      jobType: "fulltime",
      registrationDeadline: new Date(Date.now() + 86_400_000),
      applicationLink: "https://example.com/apply",
      postedBy: coordinator._id,
    });
    const studentClient = await loginAs(student);
    const first = await studentClient.get("/api/drives");
    expect(first.status).toBe(200);
    expect(cacheStore.has("cache:drives:catalog:default")).toBe(true);
    const cachedRow = cacheStore.get("cache:drives:catalog:default")[0];
    expect(cachedRow).not.toHaveProperty("applicationCount");
    expect(cachedRow).not.toHaveProperty("currentRoundId");
    expect(cachedRow).not.toHaveProperty("hasApplied");
    expect(cachedRow).not.toHaveProperty("eligibility");

    await Application.create({ student: student._id, drive: drive._id });
    await Drive.updateOne({ _id: drive._id }, { $set: { applicationCount: 7 } });
    const second = await studentClient.get("/api/drives");
    expect(second.status).toBe(200);
    const original = first.body.data.drives[0];
    const cached = second.body.data.drives[0];
    expect(Object.keys(cached).sort()).toEqual(Object.keys(original).sort());
    expect(cached.applicationCount).toBe(7);
    expect(cached.hasApplied).toBe(true);
    expect(cached.sortWeight).toBe(3);
    expect(cached).toHaveProperty("currentRoundId");
    expect(cached).toHaveProperty("updatedAt");

    const coordinatorClient = await loginAs(coordinator);
    const edited = await coordinatorClient.patch(`/api/drives/${drive._id}`)
      .send({ companyName: "Acme Updated" });
    expect(edited.status).toBe(200);
    expect(cacheStore.has("cache:drives:catalog:default")).toBe(false);
    const afterEdit = await studentClient.get("/api/drives");
    expect(afterEdit.body.data.drives[0].companyName).toBe("Acme Updated");

    const search = await studentClient.get("/api/drives").query({ search: "Acme" });
    expect(search.status).toBe(200);
    expect(search.body.data.drives[0].companyName).toBe("Acme Updated");
  });

  it("shares academic data but derives CR access and invalidates period and subject edits", async () => {
    const representative = await makeUser();
    const classmate = await makeUser();
    const superadmin = await makeUser({ role: "superadmin" });
    const curriculum = await Curriculum.create({
      branch: "CSE",
      semesterNumber: 1,
      subjects: [{ name: "Mathematics", code: "M101" }],
      createdBy: superadmin._id,
    });
    const classroom = await Classroom.create({
      branch: "CSE",
      batch: 2023,
      section: "A",
      classRepresentative: representative._id,
      currentSemesterNumber: 1,
      curriculum: curriculum._id,
    });
    await User.updateMany(
      { _id: { $in: [representative._id, classmate._id] } },
      { $set: { classroom: classroom._id } },
    );
    const representativeClient = await loginAs(representative);
    const classmateClient = await loginAs(classmate);
    const key = `cache:classroom:${classroom._id}:academic`;

    const repView = await representativeClient.get("/api/classroom");
    const classmateView = await classmateClient.get("/api/classroom");
    expect(repView.status).toBe(200);
    expect(repView.body.data.isClassRep).toBe(true);
    expect(classmateView.body.data.isClassRep).toBe(false);
    expect(classmateView.body.data.classroom.classRepresentative.firstName)
      .toBe(representative.firstName);
    expect(cacheStore.has(key)).toBe(true);
    const dashboard = await classmateClient.get("/api/dashboard");
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.profile.classroomId).toBe(String(classroom._id));

    const subjectId = curriculum.subjects[0]._id;
    const added = await representativeClient.post(`/api/classroom/${classroom._id}/periods`)
      .send({ day: "Monday", subject: String(subjectId), startTime: 540, endTime: 600 });
    expect(added.status).toBe(201);
    expect(cacheStore.has(key)).toBe(false);
    const withPeriod = await classmateClient.get("/api/classroom");
    expect(withPeriod.body.data.classroom.periods).toHaveLength(1);

    const adminClient = await loginAs(superadmin);
    const subjectEdit = await adminClient.patch(
      `/api/curriculum/${curriculum._id}/subjects/${subjectId}`,
    ).send({ name: "Applied Mathematics" });
    expect(subjectEdit.status).toBe(200);
    expect(cacheStore.has(key)).toBe(false);
    const refreshed = await classmateClient.get("/api/classroom");
    expect(refreshed.body.data.classroom.curriculum.subjects[0].name)
      .toBe("Applied Mathematics");
  });
});
