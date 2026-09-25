import { beforeAll, describe, expect, it } from "vitest";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import { loginAs, makeUser } from "./helpers.js";

describe("Global Search and Event list improvements", () => {
  let club, user, agent;

  beforeAll(async () => {
    user = await makeUser();
    club = await Club.create({
      clubName: "Event Search Test Club",
      description: "Test events",
      category: "Technical",
      isActive: true,
    });
    agent = await loginAs(user);
  });

  const eventData = (eventName, startDateTime, endDateTime, status) => ({
    eventName,
    description: "Campus event",
    startDateTime,
    endDateTime,
    venue: "Main Hall",
    category: "Technical",
    organizerClub: club._id,
    createdBy: user._id,
    ...(status && { status }),
  });

  it("excludes cancelled Events from Global Search", async () => {
    const start = new Date(Date.now() + 86400000);
    const end = new Date(start.getTime() + 3600000);
    await Event.insertMany([
      eventData("Zephyr Lantern Live", start, end),
      eventData("Zephyr Lantern Cancelled", start, end, "Cancelled"),
    ]);

    const res = await agent.get("/api/dashboard/search").query({ q: "Zephyr Lantern" });
    expect(res.status).toBe(200);
    expect(res.body.data.filter((item) => item.type === "event").map((item) => item.title))
      .toEqual(["Zephyr Lantern Live"]);
  });

  it("pages Events deterministically when their start times tie", async () => {
    const now = Date.now();
    const hour = 3600000;
    const day = 24 * hour;
    const tiedStart = new Date(now + 7 * day);
    const ongoing = eventData("Orion Paging Ongoing", new Date(now - hour), new Date(now + hour));
    const upcoming = Array.from({ length: 16 }, (_, i) =>
      eventData(`Orion Paging Upcoming ${i}`, tiedStart, new Date(tiedStart.getTime() + hour)));
    const completed = eventData("Orion Paging Completed", new Date(now - 3 * day), new Date(now - 2 * day));
    const cancelled = eventData("Orion Paging Cancelled", tiedStart, new Date(tiedStart.getTime() + hour), "Cancelled");
    const seeded = await Event.insertMany([ongoing, ...upcoming, completed, cancelled]);

    const first = await agent.get("/api/events").query({ search: "Orion Paging", offset: 0 });
    const second = await agent.get("/api/events").query({ search: "Orion Paging", offset: 15 });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data).toMatchObject({ totalRecords: 18, hasMore: true, nextOffset: 15 });
    expect(second.body.data).toMatchObject({ totalRecords: 18, hasMore: false, nextOffset: 18 });

    const returnedIds = [...first.body.data.events, ...second.body.data.events]
      .map((event) => event._id);
    const expectedIds = [
      String(seeded[0]._id),
      ...seeded.slice(1, 17).map((event) => String(event._id)).sort(),
      String(seeded[17]._id),
    ];
    expect(returnedIds).toEqual(expectedIds);
    expect(first.body.data.events[0].organizerClub.clubName).toBe(club.clubName);
  });
});
