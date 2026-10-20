import { beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import Club from "../models/Club.js";
import Drive from "../models/Drive.js";
import Application from "../models/Application.js";
import Event from "../models/Event.js";
import Discussion from "../models/Discussion.js";
import Notice from "../models/Notice.js";
import { Announcement } from "../models/Announcement.js";
import { loginAs, makeUser } from "./helpers.js";

describe("search and management list correctness", () => {
  let student, admin, studentClient, adminClient, activeClub, inactiveClub, generalClub, event;

  beforeAll(async () => {
    student = await makeUser();
    admin = await makeUser({ role: "superadmin" });
    [activeClub, inactiveClub, generalClub] = await Club.create([
      { clubName: "Robotics Search Club", description: "Robots", category: "Technical", isActive: true },
      { clubName: "Hidden Search Club", description: "Awaiting approval", category: "Technical" },
      { clubName: "General Search Club", description: "Other", category: "Technical", isActive: true },
    ]);
    event = await Event.create({
      eventName: "Search Fair",
      description: "A fair",
      startDateTime: new Date(Date.now() + 86400000),
      endDateTime: new Date(Date.now() + 90000000),
      venue: "Hall A",
      category: "Technical",
      organizerClub: activeClub._id,
      createdBy: admin._id,
    });
    student.followedClubs = [activeClub._id];
    student.registeredEvents = [event._id];
    await student.save();
    studentClient = await loginAs(student);
    adminClient = await loginAs(admin);
  });

  it("searches before Community pagination and retains type and audience buckets", async () => {
    const seeded = await Announcement.insertMany([
      ...Array.from({ length: 25 }, (_, i) => ({
        title: `Recent ${i}`, body: "Campus update", postedBy: admin._id,
        targetType: "club", club: activeClub._id,
      })),
      { title: "Needle from last month", body: "Unique update", postedBy: admin._id,
        targetType: "club", club: activeClub._id },
    ]);

    await Announcement.collection.updateOne(
      { _id: seeded.at(-1)._id },
      { $set: { createdAt: new Date(Date.now() - 86400000) } },
    );
    const unfiltered = await studentClient.get("/api/announcements/community");
    expect(unfiltered.body.data.feed.map((item) => item.title))
      .not.toContain("Needle from last month");
    expect(unfiltered.body.data.hasMore).toBe(true);

    const found = await studentClient.get("/api/announcements/community")
      .query({ search: "Needle from last month", type: "club" });
    expect(found.status).toBe(200);
    expect(found.body.data.feed.map((item) => item.title)).toEqual(["Needle from last month"]);

    const none = await studentClient.get("/api/announcements/community")
      .query({ search: "Needle from last month", type: "event" });
    expect(none.body.data.feed).toEqual([]);
    expect(none.body.data.hasMore).toBe(false);

    const source = await studentClient.get("/api/announcements/community")
      .query({ search: "Robotics Search", type: "club" });
    expect(source.body.data.feed).toHaveLength(20);
    expect(source.body.data.hasMore).toBe(true);

    await Announcement.insertMany([
      { title: "Crossbucket event", body: "Update", postedBy: admin._id,
        targetType: "event", event: event._id },
      { title: "Crossbucket general", body: "Update", postedBy: admin._id,
        targetType: "club", club: generalClub._id },
    ]);
    const combined = await studentClient.get("/api/announcements/community")
      .query({ search: "Crossbucket", type: "All" });
    const eventsOnly = await studentClient.get("/api/announcements/community")
      .query({ search: "Crossbucket", type: "event" });
    expect(combined.body.data.feed.map((item) => item.title).sort())
      .toEqual(["Crossbucket event", "Crossbucket general"]);
    expect(eventsOnly.body.data.feed.map((item) => item.title))
      .toEqual(["Crossbucket event"]);
  });

  it("continues through matching Community pages", async () => {
    await Announcement.insertMany(Array.from({ length: 22 }, (_, i) => ({
      title: `Paged match ${i}`, body: "Another update", postedBy: admin._id,
      targetType: "club", club: activeClub._id,
    })));
    const first = await studentClient.get("/api/announcements/community")
      .query({ search: "Paged match", type: "club" });
    expect(first.body.data.feed).toHaveLength(20);
    expect(first.body.data.hasMore).toBe(true);
    const second = await studentClient.get("/api/announcements/community")
      .query({ search: "Paged match", type: "club", ...first.body.data.offsets });
    expect(second.body.data.feed).toHaveLength(2);
    expect(second.body.data.hasMore).toBe(false);
  });

  it("orders tied Community timestamps across all audience buckets and pages", async () => {
    const makeAnnouncements = (targetType, targetId) => Array.from({ length: 10 }, (_, i) => ({
      title: `Tied pagination ${targetType} ${i}`,
      body: "Same timestamp",
      postedBy: admin._id,
      targetType,
      ...(targetType === "event" ? { event: targetId } : { club: targetId }),
    }));
    const seeded = await Announcement.insertMany([
      ...makeAnnouncements("event", event._id),
      ...makeAnnouncements("club", activeClub._id),
      ...makeAnnouncements("club", generalClub._id),
    ]);
    await Announcement.collection.updateMany(
      { _id: { $in: seeded.map((item) => item._id) } },
      { $set: { createdAt: new Date("2025-01-01T00:00:00.000Z") } },
    );

    const first = await studentClient.get("/api/announcements/community")
      .query({ search: "Tied pagination", type: "All" });
    const second = await studentClient.get("/api/announcements/community")
      .query({ search: "Tied pagination", type: "All", ...first.body.data.offsets });
    expect(first.body.data.feed).toHaveLength(20);
    expect(second.body.data.feed).toHaveLength(10);
    expect(first.body.data.hasMore).toBe(true);
    expect(second.body.data.hasMore).toBe(false);

    const returnedIds = [...first.body.data.feed, ...second.body.data.feed]
      .map((item) => item._id);
    expect(new Set(returnedIds).size).toBe(seeded.length);
    expect([...returnedIds].sort()).toEqual(seeded.map((item) => String(item._id)).sort());
    for (const group of [seeded.slice(0, 10), seeded.slice(10, 20), seeded.slice(20)]) {
      const expected = group.map((item) => String(item._id)).sort().reverse();
      const groupIds = new Set(expected);
      expect(returnedIds.filter((id) => groupIds.has(id))).toEqual(expected);
    }

    const eventsOnly = await studentClient.get("/api/announcements/community")
      .query({ search: "Tied pagination", type: "event" });
    expect(eventsOnly.body.data.feed.map((item) => item._id))
      .toEqual(seeded.slice(0, 10).map((item) => String(item._id)).sort().reverse());
    expect(eventsOnly.body.data.hasMore).toBe(false);
  });

  it("keeps inactive clubs out of student lists and allows superadmin review", async () => {
    const [studentList, popular, adminList, hiddenDetail] = await Promise.all([
      studentClient.get("/api/clubs"),
      studentClient.get("/api/clubs/popular"),
      adminClient.get("/api/clubs"),
      studentClient.get(`/api/clubs/${inactiveClub._id}`),
    ]);
    expect(studentList.body.data.map((club) => club.clubName)).not.toContain(inactiveClub.clubName);
    expect(popular.body.data.map((club) => club.clubName)).not.toContain(inactiveClub.clubName);
    expect(adminList.body.data.map((club) => club.clubName)).toContain(inactiveClub.clubName);
    expect(hiddenDetail.status).toBe(404);
    expect((await adminClient.get(`/api/clubs/${inactiveClub._id}`)).status).toBe(200);
  });

  it("pages admin platform notices while the normal feed stays compact", async () => {
    await Notice.insertMany(Array.from({ length: 27 }, (_, i) => ({
      title: `Platform ${i}`, content: "Notice", targetType: "platform", createdBy: admin._id,
    })));
    const [feed, first, second, forbidden] = await Promise.all([
      studentClient.get("/api/notices").query({ targetType: "platform" }),
      adminClient.get("/api/notices/manage/platform").query({ page: 1 }),
      adminClient.get("/api/notices/manage/platform").query({ page: 2 }),
      studentClient.get("/api/notices/manage/platform"),
    ]);
    expect(feed.body.data.notices).toHaveLength(5);
    expect(first.body.data.notices).toHaveLength(20);
    expect(second.body.data.notices).toHaveLength(7);
    expect(first.body.data.pagination).toMatchObject({ total: 27, page: 1, pages: 2 });
    expect(forbidden.status).toBe(403);
  });

  it("exposes applicant pages beyond row 200 for the coordinator tab", async () => {
    const drive = await Drive.create({
      companyName: "Paging Company", role: "Engineer", jobType: "fulltime",
      registrationDeadline: new Date(Date.now() + 86400000),
      applicationLink: "https://example.com/apply", postedBy: admin._id,
    });
    await Application.insertMany(Array.from({ length: 201 }, () => ({
      student: new mongoose.Types.ObjectId(), drive: drive._id,
    })));
    const res = await adminClient.get(`/api/drives/${drive._id}/applications`)
      .query({ page: 5, limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.applications).toHaveLength(1);
    expect(res.body.data.pagination).toMatchObject({ total: 201, page: 5, pages: 5 });
  });

  it("sorts the Most viewed discussion option by stored views", async () => {
    await Discussion.create([
      { title: "Quiet topic", content: "Quiet content", category: "general", author: student._id, views: 2,
        upvotes: [student._id, admin._id] },
      { title: "Viewed topic", content: "Viewed content", category: "general", author: student._id, views: 20 },
    ]);
    const res = await studentClient.get("/api/discussions").query({ sort: "popular" });
    expect(res.status).toBe(200);
    expect(res.body.data.discussions.map((discussion) => discussion.title).slice(0, 2))
      .toEqual(["Viewed topic", "Quiet topic"]);
  });
});
