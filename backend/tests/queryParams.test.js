import { beforeAll, describe, expect, it } from "vitest";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import Drive from "../models/Drive.js";
import Discussion from "../models/Discussion.js";
import Notice from "../models/Notice.js";
import RosterEntry from "../models/RosterEntry.js";
import { Announcement } from "../models/Announcement.js";
import { loginAs, makeUser } from "./helpers.js";
import { normalizeSearch, parseQueryInt } from "../utils/queryParams.js";

describe("list query parameter helpers", () => {
  it("trims search text and rejects values over 100 characters", () => {
    expect(normalizeSearch("   amazon   ")).toBe("amazon");
    expect(normalizeSearch(" \t ")).toBe("");
    expect(normalizeSearch({ value: "amazon" })).toBe("");
    expect(normalizeSearch("a".repeat(100))).toHaveLength(100);
    expect(() => normalizeSearch("a".repeat(101))).toThrow(/100 characters/);
  });

  it("defaults malformed integers and retains minimums and caps", () => {
    for (const value of ["2abc", "1.5", "-4", "NaN", "0", "", "9007199254740992", ["2"]]) {
      expect(parseQueryInt(value, 1)).toBe(1);
    }
    expect(parseQueryInt("0", 0, 0)).toBe(0);
    expect(parseQueryInt("-1", 0, 0)).toBe(0);
    expect(parseQueryInt("101", 20, 1, 100)).toBe(100);
    expect(parseQueryInt("201", 50, 1, 200)).toBe(200);
    expect(parseQueryInt("3", 1)).toBe(3);
  });
});

describe("searchable list parameter handling", () => {
  let agent, drive;

  beforeAll(async () => {
    const admin = await makeUser({ role: "superadmin" });
    const club = await Club.create({
      clubName: "Amazon Test Club", description: "Test", category: "Technical", isActive: true,
    });
    admin.followedClubs = [club._id];
    await admin.save();
    const start = new Date(Date.now() + 86400000);
    await Event.create({
      eventName: "Amazon Campus Event", description: "Test", startDateTime: start,
      endDateTime: new Date(start.getTime() + 3600000), venue: "Hall A",
      category: "Technical", organizerClub: club._id, createdBy: admin._id,
    });
    drive = await Drive.create({
      companyName: "Amazon Campus Drive", role: "Engineer", jobType: "fulltime",
      registrationDeadline: start, applicationLink: "https://example.com/apply", postedBy: admin._id,
    });
    await Discussion.create(Array.from({ length: 6 }, (_, i) => ({
      title: `Amazon Topic ${i}`, content: "Test discussion", category: "general", author: admin._id,
    })));
    await RosterEntry.create({
      rollNumber: "AMAZON01", email: "amazon01@college.edu", firstName: "Test",
      lastName: "Student", branch: "CSE", batch: 2023, section: "A", year: 3,
    });
    await Announcement.create({
      title: "Amazon Club Update", body: "Test", postedBy: admin._id,
      targetType: "club", club: club._id,
    });
    await Notice.create({
      title: "Test platform notice", content: "Test", targetType: "platform", createdBy: admin._id,
    });
    agent = await loginAs(admin);
  });

  const searchLists = [
    ["/api/events", (data) => data.events.map((item) => item._id)],
    ["/api/discussions", (data) => data.discussions.map((item) => item._id)],
    ["/api/drives", (data) => data.drives.map((item) => item._id)],
    ["/api/admin/roster", (data) => data.entries.map((item) => item._id)],
    ["/api/announcements/community", (data) => data.feed.map((item) => item._id)],
  ];

  it("trims and bounds search without changing the matching fields", async () => {
    for (const [path, ids] of searchLists) {
      const plain = await agent.get(path).query({ search: "amazon" });
      const padded = await agent.get(path).query({ search: "   amazon   " });
      const noSearch = await agent.get(path);
      const whitespace = await agent.get(path).query({ search: "   " });
      const tooLong = await agent.get(path).query({ search: "x".repeat(101) });
      expect(plain.status).toBe(200);
      expect(ids(plain.body.data).length).toBeGreaterThan(0);
      expect(ids(padded.body.data)).toEqual(ids(plain.body.data));
      expect(ids(whitespace.body.data)).toEqual(ids(noSearch.body.data));
      expect(tooLong.status).toBe(400);
    }
  });

  it("defaults malformed page and limit values at the list endpoints", async () => {
    for (const path of ["/api/discussions", "/api/drives", "/api/admin/roster", "/api/notices/manage/platform", `/api/drives/${drive._id}/applications`]) {
      for (const page of ["2abc", "0", "-1", "1.5", "NaN"]) {
        const res = await agent.get(path).query({ page });
        expect(res.status).toBe(200);
        expect(res.body.data.pagination.page).toBe(1);
      }
    }
    const malformedLimit = await agent.get("/api/discussions").query({ limit: "abc" });
    expect(malformedLimit.body.data.discussions).toHaveLength(5);
    expect(malformedLimit.body.data.pagination.pages).toBe(2);
    const largeLimit = await agent.get("/api/discussions").query({ limit: "1000" });
    expect(largeLimit.body.data.discussions).toHaveLength(6);
    expect(largeLimit.body.data.pagination.pages).toBe(1);
  });

  it("defaults malformed Event and Community offsets to zero", async () => {
    for (const offset of ["2abc", "-1", "1.5", "NaN"]) {
      const events = await agent.get("/api/events").query({ offset });
      expect(events.status).toBe(200);
      expect(events.body.data.events).toHaveLength(1);
      expect(events.body.data.nextOffset).toBe(1);

      const community = await agent.get("/api/announcements/community")
        .query({ clubOffset: offset, eventOffset: offset, generalOffset: offset });
      expect(community.status).toBe(200);
      expect(community.body.data.feed).toHaveLength(1);
      expect(community.body.data.offsets).toEqual({ eventOffset: 0, clubOffset: 1, generalOffset: 0 });
    }
  });
});
