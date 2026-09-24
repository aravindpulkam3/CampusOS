import { beforeAll, describe, expect, it } from "vitest";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { loginAs, makeUser } from "./helpers.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const at = (offset) => new Date(Date.now() + offset);

// The registration count is derived from User.registeredEvents (the single
// source of truth), so these tests pin that it follows every register /
// unregister exactly — including duplicates and races — with nothing to drift.
describe("event registration", () => {
  let club, clubAdmin, superadmin;

  const makeEvent = (overrides = {}) =>
    Event.create({
      eventName: "Hack Night",
      description: "-",
      startDateTime: at(5 * DAY),
      endDateTime: at(5 * DAY + 3 * HOUR),
      registrationDeadline: at(4 * DAY),
      venue: "Hall A",
      category: "Technical",
      organizerClub: club._id,
      createdBy: clubAdmin._id,
      ...overrides,
    });

  const details = async (agent, event) => {
    const res = await agent.get(`/api/events/${event._id}`);
    expect(res.status).toBe(200);
    return res.body.data;
  };

  beforeAll(async () => {
    clubAdmin = await makeUser();
    superadmin = await makeUser({ role: "superadmin" });
    club = await Club.create({
      clubName: "Coding Club",
      description: "Code",
      category: "Technical",
      clubAdmins: [clubAdmin._id],
      isActive: true,
    });
  });

  it("counts registrations and reports the viewer's own state", async () => {
    const event = await makeEvent();
    const alice = await makeUser();
    const bob = await makeUser();
    const a = await loginAs(alice);
    const b = await loginAs(bob);

    let data = await details(a, event);
    expect(data.registrationCount).toBe(0);
    expect(data.isRegistered).toBe(false);

    const res = await a.put(`/api/events/${event._id}/register`);
    expect(res.status).toBe(201);
    expect(res.body.data.registrationCount).toBe(1);
    expect(res.body.data.isRegistered).toBe(true);

    // A fresh load (a page refresh) keeps the value.
    data = await details(a, event);
    expect(data.registrationCount).toBe(1);
    expect(data.isRegistered).toBe(true);

    await b.put(`/api/events/${event._id}/register`).expect(201);
    data = await details(b, event);
    expect(data.registrationCount).toBe(2);
    expect(data.isRegistered).toBe(true);
    // Alice's view reports her own state, not Bob's.
    expect((await details(a, event)).registrationCount).toBe(2);
  });

  it("never counts a duplicate registration", async () => {
    const event = await makeEvent();
    const agent = await loginAs(await makeUser());

    await agent.put(`/api/events/${event._id}/register`).expect(201);
    const dup = await agent.put(`/api/events/${event._id}/register`);
    expect(dup.status).toBe(409);
    expect((await details(agent, event)).registrationCount).toBe(1);
  });

  it("registers exactly once under parallel requests", async () => {
    const event = await makeEvent();
    const user = await makeUser();
    const agent = await loginAs(user);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => agent.put(`/api/events/${event._id}/register`)),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    expect((await details(agent, event)).registrationCount).toBe(1);

    const stored = await User.findById(user._id).lean();
    expect(stored.registeredEvents.filter((id) => id.equals(event._id))).toHaveLength(1);
  });

  it("unregisters idempotently without going below the true count", async () => {
    const event = await makeEvent();
    const stayer = await loginAs(await makeUser());
    const leaver = await loginAs(await makeUser());
    await stayer.put(`/api/events/${event._id}/register`).expect(201);
    await leaver.put(`/api/events/${event._id}/register`).expect(201);

    const res = await leaver.delete(`/api/events/${event._id}/register`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ isRegistered: false, registrationCount: 1 });

    // Again, and in parallel: still 200, and the stayer is still counted.
    const repeats = await Promise.all(
      Array.from({ length: 3 }, () => leaver.delete(`/api/events/${event._id}/register`)),
    );
    expect(repeats.map((r) => r.status)).toEqual([200, 200, 200]);
    const data = await details(leaver, event);
    expect(data.registrationCount).toBe(1);
    expect(data.isRegistered).toBe(false);

    // Someone who never registered can't decrement anything either.
    const stranger = await loginAs(await makeUser());
    await stranger.delete(`/api/events/${event._id}/register`).expect(200);
    expect((await details(stayer, event)).registrationCount).toBe(1);
  });

  it("allows registering again after unregistering", async () => {
    const event = await makeEvent();
    const agent = await loginAs(await makeUser());
    await agent.put(`/api/events/${event._id}/register`).expect(201);
    await agent.delete(`/api/events/${event._id}/register`).expect(200);
    const res = await agent.put(`/api/events/${event._id}/register`);
    expect(res.status).toBe(201);
    expect(res.body.data.registrationCount).toBe(1);
  });

  it("refuses register and unregister once registration has closed", async () => {
    const event = await makeEvent();
    const user = await makeUser();
    const agent = await loginAs(user);
    await agent.put(`/api/events/${event._id}/register`).expect(201);

    await Event.updateOne({ _id: event._id }, { registrationDeadline: at(-HOUR) });

    const late = await loginAs(await makeUser());
    expect((await late.put(`/api/events/${event._id}/register`)).status).toBe(400);
    expect((await agent.delete(`/api/events/${event._id}/register`)).status).toBe(400);

    const data = await details(agent, event);
    expect(data.isRegistered).toBe(true);
    expect(data.registrationCount).toBe(1);
  });

  it("refuses both on a cancelled event", async () => {
    const event = await makeEvent({ status: "Cancelled" });
    const agent = await loginAs(await makeUser());
    expect((await agent.put(`/api/events/${event._id}/register`)).status).toBe(400);
    expect((await agent.delete(`/api/events/${event._id}/register`)).status).toBe(400);
  });

  it("refuses ineligible students", async () => {
    const byBranch = await makeEvent({ eligibleBranches: ["ECE"] });
    const byYear = await makeEvent({ eligibleYears: [1] });
    const agent = await loginAs(await makeUser()); // CSE, year 3
    expect((await agent.put(`/api/events/${byBranch._id}/register`)).status).toBe(403);
    expect((await agent.put(`/api/events/${byYear._id}/register`)).status).toBe(403);
    expect((await details(agent, byBranch)).registrationCount).toBe(0);
  });

  it("returns 404 for an unknown event", async () => {
    const agent = await loginAs(await makeUser());
    const missing = "64b000000000000000000000";
    expect((await agent.delete(`/api/events/${missing}/register`)).status).toBe(404);
  });

  it.each([
    ["the organizer club's admin", () => clubAdmin, true],
    ["a superadmin", () => superadmin, true],
    ["a student", () => null, false],
  ])("reports isOrganizer for %s", async (_label, who, expected) => {
    const event = await makeEvent();
    const agent = await loginAs(who() ?? (await makeUser()));
    expect((await details(agent, event)).isOrganizer).toBe(expected);
  });

  // The form sends an exact instant (datetime-local → ISO). It must come back
  // unchanged, and registration must close at that instant — not at a
  // date-only midnight or at the start.
  it("stores an exact registration deadline and enforces it", async () => {
    const admin = await loginAs(clubAdmin);
    const deadline = at(2 * HOUR);
    deadline.setUTCSeconds(0, 0);
    const created = await admin.post("/api/events/create").send({
      eventName: "Deadline Check",
      description: "-",
      startDateTime: at(3 * DAY).toISOString(),
      endDateTime: at(3 * DAY + HOUR).toISOString(),
      registrationDeadline: deadline.toISOString(),
      venue: "Hall B",
      category: "Technical",
      organizerClub: String(club._id),
    });
    expect(created.status).toBe(201);
    const eventId = created.body.data._id;

    const student = await loginAs(await makeUser());
    const res = await student.get(`/api/events/${eventId}`);
    expect(res.body.data.event.registrationDeadline).toBe(deadline.toISOString());

    await student.put(`/api/events/${eventId}/register`).expect(201);

    // Once the deadline passes (start is still days away), registration closes.
    await Event.updateOne({ _id: eventId }, { registrationDeadline: at(-60_000) });
    const late = await loginAs(await makeUser());
    expect((await late.put(`/api/events/${eventId}/register`)).status).toBe(400);
  });

  it("reports no deadline as null (registration closes at the start)", async () => {
    const event = await makeEvent({ registrationDeadline: null });
    const agent = await loginAs(await makeUser());
    expect((await details(agent, event)).event.registrationDeadline).toBeNull();
  });

  it("rejects a deadline after the start", async () => {
    const admin = await loginAs(clubAdmin);
    const res = await admin.post("/api/events/create").send({
      eventName: "Bad Deadline",
      description: "-",
      startDateTime: at(DAY).toISOString(),
      endDateTime: at(DAY + HOUR).toISOString(),
      registrationDeadline: at(DAY + 30 * 60_000).toISOString(),
      venue: "Hall B",
      category: "Technical",
      organizerClub: String(club._id),
    });
    expect(res.status).toBe(400);
  });

  it("backs the count with an index on registeredEvents", async () => {
    await User.syncIndexes();
    const indexes = await User.collection.indexes();
    expect(indexes.some((i) => JSON.stringify(i.key) === '{"registeredEvents":1}')).toBe(true);
  });
});
