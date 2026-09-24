import { beforeAll, describe, expect, it } from "vitest";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import { loginAs, makeUser } from "./helpers.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const at = (offset) => new Date(Date.now() + offset);

// The club page shows upcoming events (nearest first) before a few recent past
// ones, so the endpoint must split and order them itself rather than return an
// arbitrary handful.
describe("GET /api/clubs/:clubId", () => {
  let club, otherClub, admin, student, superadmin;

  beforeAll(async () => {
    admin = await makeUser();
    student = await makeUser();
    superadmin = await makeUser({ role: "superadmin" });
    [club, otherClub] = await Club.create([
      {
        clubName: "Robotics Club",
        description: "Builds robots",
        category: "Technical",
        clubAdmins: [admin._id],
        isActive: true,
      },
      { clubName: "Drama Club", description: "Plays", category: "Cultural" },
    ]);

    const event = (eventName, start, end, organizerClub = club._id) => ({
      eventName,
      description: "-",
      startDateTime: start,
      endDateTime: end,
      venue: "Hall A",
      category: "Technical",
      organizerClub,
      createdBy: admin._id,
    });
    // Inserted out of order on purpose.
    await Event.create([
      event("Later", at(10 * DAY), at(10 * DAY + HOUR)),
      event("Ongoing", at(-HOUR), at(HOUR)),
      { ...event("Sooner", at(2 * DAY), at(2 * DAY + HOUR)), banner: "https://img.example/sooner.jpg" },
      event("Past 5", at(-50 * DAY), at(-50 * DAY + HOUR)),
      event("Past 1", at(-2 * DAY), at(-2 * DAY + HOUR)),
      event("Past 3", at(-20 * DAY), at(-20 * DAY + HOUR)),
      event("Past 2", at(-10 * DAY), at(-10 * DAY + HOUR)),
      event("Past 4", at(-30 * DAY), at(-30 * DAY + HOUR)),
      event("Other club", at(DAY), at(DAY + HOUR), otherClub._id),
    ]);
  });

  it("lists upcoming events nearest first, including ongoing ones", async () => {
    const agent = await loginAs(student);
    const res = await agent.get(`/api/clubs/${club._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.upcomingEvents.map((e) => e.eventName)).toEqual([
      "Ongoing",
      "Sooner",
      "Later",
    ]);
    // Rows show the event banner as their thumbnail.
    expect(res.body.data.upcomingEvents[1].banner).toBe("https://img.example/sooner.jpg");
  });

  it("returns only the latest 3 past events, most recent first, with a total", async () => {
    const agent = await loginAs(student);
    const res = await agent.get(`/api/clubs/${club._id}`);
    expect(res.body.data.pastEvents.map((e) => e.eventName)).toEqual([
      "Past 1",
      "Past 2",
      "Past 3",
    ]);
    expect(res.body.data.pastEventCount).toBe(5);
  });

  it("populates core members with names only", async () => {
    const agent = await loginAs(student);
    const res = await agent.get(`/api/clubs/${club._id}`);
    const [member] = res.body.data.club.clubAdmins;
    expect(member._id).toBe(String(admin._id));
    expect(member.firstName).toBe(admin.firstName);
    expect(member.lastName).toBe(admin.lastName);
    expect(member).not.toHaveProperty("email");
    expect(member).not.toHaveProperty("password");
    expect(member).not.toHaveProperty("rollNumber");
  });

  it.each([
    ["a club admin", () => admin, true],
    ["a superadmin", () => superadmin, true],
    ["a student", () => student, false],
  ])("reports isAdmin for %s", async (_label, who, expected) => {
    const agent = await loginAs(who());
    const res = await agent.get(`/api/clubs/${club._id}`);
    expect(res.body.data.isAdmin).toBe(expected);
  });
});
