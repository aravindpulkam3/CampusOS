import { beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import app from "../app.js";
import Discussion from "../models/Discussion.js";
import Comment from "../models/Comment.js";
import Reply from "../models/Reply.js";
import { loginAs, makeUser } from "./helpers.js";

const oid = () => new mongoose.Types.ObjectId();
const T0 = Date.parse("2026-01-01T10:00:00.000Z");
const at = (seconds) => new Date(T0 + seconds * 1000);

const makeDiscussion = (author, overrides = {}) =>
  Discussion.create({
    title: "Pagination",
    content: "How do cursors work?",
    category: "coding",
    author: author._id,
    ...overrides,
  });

// Raw inserts, so createdAt is exactly what a test says — including exact ties.
// ObjectIds are generated in order, so _id ascends with the index.
const seedComments = async (discussion, author, n, createdAtFor = at) => {
  const docs = Array.from({ length: n }, (_, i) => ({
    _id: oid(),
    discussion: discussion._id,
    author: author._id,
    content: `comment ${i}`,
    upvotes: [],
    isAcceptedAnswer: false,
    replyCount: 0,
    isEdited: false,
    isDeleted: false,
    createdAt: createdAtFor(i),
    updatedAt: createdAtFor(i),
  }));
  await Comment.collection.insertMany(docs);
  return docs;
};

const seedReplies = async (comment, author, n, createdAtFor = at) => {
  const docs = Array.from({ length: n }, (_, i) => ({
    _id: oid(),
    comment: comment._id,
    parentReply: null,
    replyingTo: null,
    author: author._id,
    content: `reply ${i}`,
    upvotes: [],
    isEdited: false,
    isDeleted: false,
    createdAt: createdAtFor(i),
    updatedAt: createdAtFor(i),
  }));
  await Reply.collection.insertMany(docs);
  await Comment.updateOne({ _id: comment._id }, { $inc: { replyCount: n } });
  return docs;
};

// Follows nextCursor to the end, checking the paging contract on every page.
const walk = async (agent, url, key, limit) => {
  const all = [];
  const sizes = [];
  let cursor = null;
  do {
    const res = await agent.get(url).query({ ...(cursor && { cursor }), ...(limit && { limit }) });
    expect(res.status).toBe(200);
    const { [key]: items, nextCursor, hasMore } = res.body.data;
    all.push(...items);
    sizes.push(items.length);
    if (hasMore) {
      // The cursor is the last item actually RETURNED (never the limit+1 probe).
      const last = items[items.length - 1];
      expect(nextCursor).toBe(`${last.createdAt}_${last._id}`);
    } else {
      expect(nextCursor).toBeNull();
    }
    cursor = nextCursor;
  } while (cursor && sizes.length < 50);
  return { all, sizes };
};

const ids = (items) => items.map((x) => String(x._id));

describe("discussion comments and replies — pagination", () => {
  let author, reader, agent;

  beforeAll(async () => {
    await Promise.all([Comment.init(), Reply.init()]); // build the page indexes
    author = await makeUser();
    reader = await makeUser();
    agent = await loginAs(reader);
  });

  describe("GET /discussions/:id", () => {
    it("returns the discussion and accepted answer, not a comment list", async () => {
      const d = await makeDiscussion(author);
      await seedComments(d, author, 3);
      const res = await agent.get(`/api/discussions/${d._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.discussion._id).toBe(String(d._id));
      expect(res.body.data.acceptedAnswer).toBeNull();
      expect(res.body.data).not.toHaveProperty("comments");
    });
  });

  describe("GET /discussions/:id/comments", () => {
    it("handles a discussion with zero comments", async () => {
      const d = await makeDiscussion(author);
      const res = await agent.get(`/api/discussions/${d._id}/comments`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ comments: [], nextCursor: null, hasMore: false });
    });

    it("returns fewer than one page in a single page, oldest first, without replies", async () => {
      const d = await makeDiscussion(author);
      const seeded = await seedComments(d, author, 5);
      const { all, sizes } = await walk(agent, `/api/discussions/${d._id}/comments`, "comments");
      expect(sizes).toEqual([5]);
      expect(ids(all)).toEqual(ids(seeded));
      expect(all[0]).not.toHaveProperty("replies");
      expect(all[0]).toHaveProperty("replyCount", 0);
      expect(all[0]).not.toHaveProperty("upvotes"); // shapeVotes: counts only
      expect(Object.keys(all[0].author).sort()).toEqual(["_id", "firstName", "lastName", "role"]);
    });

    it("pages 45 comments into 20 + 20 + 5 with no duplicates or gaps", async () => {
      const d = await makeDiscussion(author);
      const seeded = await seedComments(d, author, 45);
      const { all, sizes } = await walk(agent, `/api/discussions/${d._id}/comments`, "comments");
      expect(sizes).toEqual([20, 20, 5]);
      expect(ids(all)).toEqual(ids(seeded));
    });

    it("never duplicates or skips comments sharing one createdAt across page boundaries", async () => {
      const d = await makeDiscussion(author);
      // Comments 4..11 all have the SAME timestamp; limit 3 puts boundaries inside the tie.
      const seeded = await seedComments(d, author, 15, (i) => (i >= 4 && i <= 11 ? at(4) : at(i)));
      const { all, sizes } = await walk(agent, `/api/discussions/${d._id}/comments`, "comments", 3);
      expect(sizes).toEqual([3, 3, 3, 3, 3]);
      expect(ids(all)).toEqual(ids(seeded)); // { createdAt, _id } order
      expect(new Set(ids(all)).size).toBe(15);
    });

    it("stays consistent when comments are added or deleted between pages", async () => {
      const d = await makeDiscussion(author);
      const seeded = await seedComments(d, author, 25);
      const page1 = await agent.get(`/api/discussions/${d._id}/comments`);
      expect(ids(page1.body.data.comments)).toEqual(ids(seeded.slice(0, 20)));

      // Soft-delete one comment already shown and one not yet shown, then post a new one.
      await Comment.updateMany({ _id: { $in: [seeded[5]._id, seeded[21]._id] } }, { isDeleted: true });
      const poster = await loginAs(await makeUser());
      const created = await poster.post(`/api/discussions/${d._id}/comments`).send({ content: "late" });
      expect(created.status).toBe(201);

      const page2 = await agent
        .get(`/api/discussions/${d._id}/comments`)
        .query({ cursor: page1.body.data.nextCursor });
      expect(ids(page2.body.data.comments)).toEqual([
        ...ids([seeded[20], seeded[22], seeded[23], seeded[24]]),
        String(created.body.data.comment._id),
      ]);
      expect(page2.body.data.hasMore).toBe(false);
    });

    it("404s a deleted or missing discussion and 400s malformed ids", async () => {
      const d = await makeDiscussion(author, { isDeleted: true });
      expect((await agent.get(`/api/discussions/${d._id}/comments`)).status).toBe(404);
      expect((await agent.get(`/api/discussions/${oid()}/comments`)).status).toBe(404);
      expect((await agent.get(`/api/discussions/not-an-id/comments`)).status).toBe(400);
      expect((await agent.get(`/api/discussions/${d._id}`)).status).toBe(404);
    });

    it("rejects malformed cursors with 400 and clamps the limit", async () => {
      const d = await makeDiscussion(author);
      await seedComments(d, author, 60);
      const url = `/api/discussions/${d._id}/comments`;
      for (const cursor of [
        "garbage",
        "_",
        `not-a-date_${oid()}`,
        "2026-01-01T10:00:00.000Z_nothex",
        "2026-01-01T10:00:00.000Z_",
      ]) {
        const res = await agent.get(url).query({ cursor });
        expect(res.status, cursor).toBe(400);
        expect(res.body.message).toBe("Invalid cursor.");
      }
      // Express 4 turns cursor[a]=b into an object — also a 400, not a Mongo error.
      expect((await agent.get(`${url}?cursor[a]=b`)).status).toBe(400);

      const size = async (limit) =>
        (await agent.get(url).query({ limit })).body.data.comments.length;
      expect(await size("abc")).toBe(20); // default
      expect(await size("-5")).toBe(1); // clamped up
      expect(await size("999")).toBe(50); // clamped down
    });

    it("requires authentication", async () => {
      const d = await makeDiscussion(author);
      const res = await request(app).get(`/api/discussions/${d._id}/comments`);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /discussions/:id/comments/:commentId/replies", () => {
    it("pages each comment's replies independently: 0, 1 and 13 (10 + 3)", async () => {
      const d = await makeDiscussion(author);
      const [none, one, many] = await seedComments(d, author, 3);
      const oneReplies = await seedReplies(one, author, 1);
      const manyReplies = await seedReplies(many, author, 13);
      const base = `/api/discussions/${d._id}/comments`;

      expect((await walk(agent, `${base}/${none._id}/replies`, "replies")).sizes).toEqual([0]);
      const a = await walk(agent, `${base}/${one._id}/replies`, "replies");
      expect(ids(a.all)).toEqual(ids(oneReplies)); // no leakage from the other comment
      const b = await walk(agent, `${base}/${many._id}/replies`, "replies");
      expect(b.sizes).toEqual([10, 3]);
      expect(ids(b.all)).toEqual(ids(manyReplies));

      // The count shipped with each comment matches the visible reply population.
      const comments = (await agent.get(base)).body.data.comments;
      expect(comments.map((c) => c.replyCount)).toEqual([0, 1, 13]);
    });

    it("never duplicates or skips replies sharing one createdAt across page boundaries", async () => {
      const d = await makeDiscussion(author);
      const [c] = await seedComments(d, author, 1);
      const seeded = await seedReplies(c, author, 9, () => at(100)); // all tied
      const { all, sizes } = await walk(agent, `/api/discussions/${d._id}/comments/${c._id}/replies`, "replies", 4);
      expect(sizes).toEqual([4, 4, 1]);
      expect(ids(all)).toEqual(ids(seeded));
    });

    it("returns replies-to-replies with parentReply and @replyingTo, and keeps children of a deleted parent", async () => {
      const d = await makeDiscussion(author);
      const commenterAgent = await loginAs(author);
      const comment = (await commenterAgent.post(`/api/discussions/${d._id}/comments`).send({ content: "Q" }))
        .body.data.comment;
      const base = `/api/discussions/${d._id}/comments/${comment._id}/replies`;

      const parentAuthor = await makeUser({ firstName: "Asha" });
      const parentAgent = await loginAs(parentAuthor);
      const parent = (await parentAgent.post(base).send({ content: "first" })).body.data.reply;
      const child = (await agent.post(base).send({ content: "second", parentReplyId: parent._id })).body.data;
      expect(child.reply.replyingTo.firstName).toBe("Asha");
      expect(child.replyCount).toBe(2);
      // parentReply (the client's nesting key) is a plain id string, never populated.
      expect(parent.parentReply).toBeNull();
      expect(child.reply.parentReply).toBe(String(parent._id));
      const page = (await agent.get(base)).body.data.replies;
      expect(page.map((r) => r.parentReply)).toEqual([null, String(parent._id)]);

      // Deleting the parent removes only the parent; the child stays visible and
      // still points at it (the client shows it at the top level).
      const del = await parentAgent.delete(`${base}/${parent._id}`);
      expect(del.body.data.replyCount).toBe(1);
      const res = await agent.get(base);
      expect(ids(res.body.data.replies)).toEqual([String(child.reply._id)]);
      expect(res.body.data.replies[0].replyingTo.firstName).toBe("Asha");
      expect(res.body.data.replies[0].parentReply).toBe(String(parent._id));
      // Replying to a deleted reply is refused.
      expect((await agent.post(base).send({ content: "x", parentReplyId: parent._id })).status).toBe(404);
    });

    it("404s a deleted comment, a comment from another discussion, and a deleted discussion", async () => {
      const d = await makeDiscussion(author);
      const other = await makeDiscussion(author);
      const [live, deleted] = await seedComments(d, author, 2);
      await Comment.updateOne({ _id: deleted._id }, { isDeleted: true });

      expect((await agent.get(`/api/discussions/${d._id}/comments/${deleted._id}/replies`)).status).toBe(404);
      expect((await agent.get(`/api/discussions/${other._id}/comments/${live._id}/replies`)).status).toBe(404);
      await Discussion.updateOne({ _id: d._id }, { isDeleted: true });
      expect((await agent.get(`/api/discussions/${d._id}/comments/${live._id}/replies`)).status).toBe(404);
      expect((await agent.get(`/api/discussions/${d._id}/comments/nope/replies`)).status).toBe(400);
    });
  });

  describe("counts after mutations", () => {
    it("returns authoritative counts and never double-decrements", async () => {
      const d = await makeDiscussion(author);
      const writer = await loginAs(await makeUser());
      const base = `/api/discussions/${d._id}/comments`;

      const c1 = await writer.post(base).send({ content: "one" });
      const c2 = await writer.post(base).send({ content: "two" });
      expect(c1.body.data.commentCount).toBe(1);
      expect(c2.body.data.commentCount).toBe(2);

      const cid = c1.body.data.comment._id;
      const r1 = await writer.post(`${base}/${cid}/replies`).send({ content: "r1" });
      const r2 = await writer.post(`${base}/${cid}/replies`).send({ content: "r2" });
      expect([r1.body.data.replyCount, r2.body.data.replyCount]).toEqual([1, 2]);

      const replyUrl = `${base}/${cid}/replies/${r1.body.data.reply._id}`;
      expect((await writer.delete(replyUrl)).body.data.replyCount).toBe(1);
      expect((await writer.delete(replyUrl)).body.data.replyCount).toBe(1); // idempotent
      const visible = (await writer.get(`${base}/${cid}/replies`)).body.data.replies;
      expect(ids(visible)).toEqual([String(r2.body.data.reply._id)]); // soft-deleted excluded

      expect((await writer.delete(`${base}/${cid}`)).body.data.commentCount).toBe(1);
      expect((await writer.delete(`${base}/${cid}`)).body.data.commentCount).toBe(1); // idempotent
      // A deleted comment's replies are no longer reachable.
      expect((await writer.get(`${base}/${cid}/replies`)).status).toBe(404);
    });
  });

  describe("authorization", () => {
    it("refuses to delete someone else's discussion, comment or reply", async () => {
      const owner = await makeUser();
      const ownerAgent = await loginAs(owner);
      const intruder = await loginAs(await makeUser());
      const d = await makeDiscussion(owner);
      const base = `/api/discussions/${d._id}/comments`;
      const comment = (await ownerAgent.post(base).send({ content: "mine" })).body.data.comment;
      const reply = (await ownerAgent.post(`${base}/${comment._id}/replies`).send({ content: "mine too" })).body.data.reply;

      expect((await intruder.delete(`/api/discussions/${d._id}`)).status).toBe(403);
      expect((await intruder.delete(`${base}/${comment._id}`)).status).toBe(403);
      expect((await intruder.delete(`${base}/${comment._id}/replies/${reply._id}`)).status).toBe(403);
      // A child id under the wrong parent in the URL is not found, not deleted.
      const otherD = await makeDiscussion(owner);
      expect((await ownerAgent.delete(`/api/discussions/${otherD._id}/comments/${comment._id}`)).status).toBe(404);

      const superadmin = await loginAs(await makeUser({ role: "superadmin" }));
      expect((await superadmin.delete(`${base}/${comment._id}/replies/${reply._id}`)).status).toBe(200);
    });
  });

  describe("accepted answer", () => {
    it("follows accept and delete without the comment list", async () => {
      const discussionAuthor = await makeUser();
      const daAgent = await loginAs(discussionAuthor);
      const d = await makeDiscussion(discussionAuthor);
      const [a, b] = await seedComments(d, author, 2);
      const get = async () => (await agent.get(`/api/discussions/${d._id}`)).body.data.acceptedAnswer;

      await daAgent.post(`/api/discussions/${d._id}/comments/${a._id}/accept`).expect(200);
      expect((await get())._id).toBe(String(a._id));
      await daAgent.post(`/api/discussions/${d._id}/comments/${b._id}/accept`).expect(200);
      expect((await get())._id).toBe(String(b._id));

      await Comment.updateOne({ _id: b._id }, { isDeleted: true });
      expect(await get()).toBeNull();
    });
  });

  describe("query plans", () => {
    const planOf = async (query) => JSON.stringify((await query.explain("queryPlanner")).queryPlanner.winningPlan);

    it("serves comment and reply pages from the keyset indexes without an in-memory sort", async () => {
      const d = await makeDiscussion(author);
      const [c] = await seedComments(d, author, 30);
      await seedReplies(c, author, 12);
      const cursor = { createdAt: at(10), _id: oid() };
      const after = {
        $or: [{ createdAt: { $gt: cursor.createdAt } }, { createdAt: cursor.createdAt, _id: { $gt: cursor._id } }],
      };
      const sort = { createdAt: 1, _id: 1 };

      for (const query of [
        Comment.find({ discussion: d._id, isDeleted: false }).sort(sort).limit(21),
        Comment.find({ discussion: d._id, isDeleted: false, ...after }).sort(sort).limit(21),
      ]) {
        const plan = await planOf(query);
        expect(plan).toContain("discussion_1_createdAt_1__id_1");
        expect(plan).not.toContain('"stage":"SORT"');
      }
      for (const query of [
        Reply.find({ comment: c._id, isDeleted: false }).sort(sort).limit(11),
        Reply.find({ comment: c._id, isDeleted: false, ...after }).sort(sort).limit(11),
      ]) {
        const plan = await planOf(query);
        expect(plan).toContain("comment_1_createdAt_1__id_1");
        expect(plan).not.toContain('"stage":"SORT"');
      }

      // Accepted-answer lookup: uses the index's `discussion` prefix and filters
      // isAcceptedAnswer while scanning that one discussion's comments.
      const accepted = await planOf(Comment.findOne({ discussion: d._id, isDeleted: false, isAcceptedAnswer: true }));
      expect(accepted).toContain("discussion_1_createdAt_1__id_1");
      expect(accepted).not.toContain("COLLSCAN");
    });
  });
});
