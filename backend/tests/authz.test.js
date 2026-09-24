import { beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import Application from "../models/Application.js";
import Classroom from "../models/Classroom.js";
import Deadline from "../models/Deadline.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { loginAs, makeRosterEntry, makeUser } from "./helpers.js";

// roleMiddleware works the same on every route, so a couple of samples are
// enough; the detailed tests are for resource-level checks below.
describe("role protection", () => {
  it("refuses a student on a superadmin route", async () => {
    const agent = await loginAs(await makeUser());
    expect((await agent.get("/api/admin/roster")).status).toBe(403);
  });

  it("lets a placement coordinator edit academics but not the year", async () => {
    const entry = await makeRosterEntry();
    const agent = await loginAs(await makeUser({ role: "placementCoordinator" }));
    const base = `/api/admin/roster/students/${entry.rollNumber}`;

    expect((await agent.patch(`${base}/academics`).send({ cgpa: 9.1 })).status).toBe(200);
    expect((await agent.patch(`${base}/year`).send({ year: 4 })).status).toBe(403);
  });
});

describe("profile tampering", () => {
  it("ignores role and roll number, and refuses CGPA", async () => {
    const user = await makeUser();
    const agent = await loginAs(user);

    const res = await agent
      .patch("/api/auth/profile")
      .send({ role: "superadmin", rollNumber: "FAKE001", bio: "hello" });
    expect(res.status).toBe(200);
    const stored = await User.findById(user._id);
    expect(stored.role).toBe("student");
    expect(stored.rollNumber).toBe(user.rollNumber);

    expect((await agent.patch("/api/auth/profile").send({ cgpa: 10 })).status).toBe(403);
  });
});

describe("other users' resources (IDOR)", () => {
  let owner, ownerAgent, otherAgent;

  beforeAll(async () => {
    owner = await makeUser();
    ownerAgent = await loginAs(owner);
    otherAgent = await loginAs(await makeUser());
  });

  it("hides another student's application and its notes", async () => {
    const application = await Application.create({
      student: owner._id,
      drive: new mongoose.Types.ObjectId(),
      status: "active",
    });

    expect((await otherAgent.get(`/api/applications/${application._id}`)).status).toBe(404);
    const notes = await otherAgent
      .patch(`/api/applications/${application._id}/notes`)
      .send({ notes: "mine now" });
    expect(notes.status).toBe(404);
    expect((await ownerAgent.get(`/api/applications/${application._id}`)).status).toBe(200);
  });

  it("won't mark another user's notification as read", async () => {
    const notification = await Notification.create({
      recipient: owner._id,
      type: "platform_notice",
      title: "Hello",
      message: "Welcome",
      targetType: "notice",
      targetId: new mongoose.Types.ObjectId(),
    });

    const res = await otherAgent.patch(`/api/notifications/${notification._id}/read`);
    expect(res.status).toBe(404);
    expect((await Notification.findById(notification._id)).isRead).toBe(false);
  });
});

describe("classroom resources", () => {
  let classA, repOfA, studentOfA, deadlineOfB;

  beforeAll(async () => {
    let classB;
    [classA, classB] = await Classroom.create([
      { branch: "IT", batch: 2024, section: "A", currentSemesterNumber: 1 },
      { branch: "IT", batch: 2024, section: "B", currentSemesterNumber: 1 },
    ]);
    repOfA = await makeUser({ classroom: classA._id });
    studentOfA = await makeUser({ classroom: classA._id });
    await Classroom.updateOne({ _id: classA._id }, { classRepresentative: repOfA._id });
    deadlineOfB = await Deadline.create({
      title: "B's quiz",
      type: "quiz",
      classroom: classB._id,
      semesterNumber: 1,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      postedBy: repOfA._id,
    });
  });

  it("won't let a class rep edit another classroom's deadline through their own classroom", async () => {
    const agent = await loginAs(repOfA);
    const res = await agent
      .put(`/api/classroom/${classA._id}/deadlines/${deadlineOfB._id}`)
      .send({ title: "hijacked" });

    expect(res.status).toBe(404);
    expect((await Deadline.findById(deadlineOfB._id)).title).toBe("B's quiz");
  });

  it("refuses classroom writes from a student who isn't the class rep", async () => {
    const agent = await loginAs(studentOfA);
    const res = await agent
      .post(`/api/classroom/${classA._id}/deadlines`)
      .send({ title: "Fake test", type: "quiz", dueDate: new Date().toISOString() });
    expect(res.status).toBe(403);
  });
});
