import { beforeAll, describe, expect, it } from "vitest";
import Classroom from "../models/Classroom.js";
import Notice from "../models/Notice.js";
import { loginAs, makeUser } from "./helpers.js";

// Regression tests for the notice-list BOLA: a classroom's notices are for its
// own students, its class rep and superadmins only.
describe("notice visibility", () => {
  let classA, classB, notice, studentA, studentB, repOfA, superadmin;

  beforeAll(async () => {
    [classA, classB] = await Classroom.create([
      { branch: "CSE", batch: 2023, section: "A" },
      { branch: "CSE", batch: 2023, section: "B" },
    ]);
    studentA = await makeUser({ classroom: classA._id });
    studentB = await makeUser({ classroom: classB._id, section: "B" });
    // Class rep of A who is a member of B: authority comes from the
    // relationship on the classroom, not from membership.
    repOfA = await makeUser({ classroom: classB._id, section: "B" });
    await Classroom.updateOne({ _id: classA._id }, { classRepresentative: repOfA._id });
    superadmin = await makeUser({ role: "superadmin" });

    notice = await Notice.create({
      title: "Lab moved",
      content: "Room 204 this week",
      targetType: "classroom",
      targetId: classA._id,
      createdBy: repOfA._id,
    });
  });

  it("rejects a listing without targetType", async () => {
    const agent = await loginAs(studentB);
    const res = await agent.get("/api/notices");
    expect(res.status).toBe(400);
  });

  it("rejects a targetId without targetType", async () => {
    const agent = await loginAs(studentB);
    const res = await agent.get("/api/notices").query({ targetId: String(classA._id) });
    expect(res.status).toBe(400);
  });

  it("refuses another classroom's notices", async () => {
    const agent = await loginAs(studentB);
    const res = await agent
      .get("/api/notices")
      .query({ targetType: "classroom", targetId: String(classA._id) });
    expect(res.status).toBe(403);
  });

  it.each([
    ["a student of the classroom", () => studentA],
    ["its class rep", () => repOfA],
    ["a superadmin", () => superadmin],
  ])("shows the classroom's notices to %s", async (_label, who) => {
    const agent = await loginAs(who());
    const res = await agent
      .get("/api/notices")
      .query({ targetType: "classroom", targetId: String(classA._id) });
    expect(res.status).toBe(200);
    expect(res.body.data.notices.map((n) => String(n._id))).toContain(String(notice._id));
  });

  it("hides another classroom's notice by id", async () => {
    const agent = await loginAs(studentB);
    const res = await agent.get(`/api/notices/${notice._id}`);
    expect(res.status).toBe(404);
  });
});
