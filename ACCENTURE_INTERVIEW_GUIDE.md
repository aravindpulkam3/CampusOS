# CampusOS — Accenture Project Interview Preparation Guide

A complete preparation guide for explaining, defending and discussing **CampusOS** in an Accenture **Associate Software Engineer (ASE)** technical interview. Every answer is based on the actual code in this repository. Nothing here is a generic MERN answer.

---

## How to use this guide

1. **Day before:** read the [Project Explanation Script](#part-b--project-explanation-script) out loud three times, then the [Top 30](#part-a--top-30-most-likely-questions-quick-revision).
2. **Deep prep:** go section by section through [Part C](#part-c--full-question-bank). Each section has three levels:
   - **Must Know** — prepare these fully.
   - **Important Follow-Ups** — what usually comes next after your first answer.
   - **Advanced** — deeper architecture, security, scale and troubleshooting.
3. **Practice the [Cross-Question Drills](#16-cross-question-drills)** with a friend — they test whether you really understand the implementation.
4. **Read [Potential Weak Points](#part-d--potential-weak-points)** so nothing an interviewer challenges surprises you.
5. Before the interview, **open the files in the `Code:` lines** and re-read the functions named there.

**Status legend:** ✅ implemented · 🟡 partially implemented · ⏳ planned / not implemented

**Speaking tips:** start with the direct answer in one sentence, then say "In CampusOS, …" and give one concrete example. Most answers should take 30–60 seconds. If you don't know something, say what you *do* know and how you'd find out — never invent.

---

## Contents

- [Project Fact Sheet](#project-fact-sheet-verified-from-the-code)
- [Implementation Status Map](#implementation-status-map)
- [Part A — Top 30 Most Likely Questions](#part-a--top-30-most-likely-questions-quick-revision)
- [Part B — Project Explanation Script](#part-b--project-explanation-script)
- [Part C — Full Question Bank](#part-c--full-question-bank)
  1. [Project Introduction](#1-project-introduction) ·
  2. [Architecture](#2-architecture) ·
  3. [Frontend](#3-frontend-react) ·
  4. [Backend](#4-backend-nodejs--express) ·
  5. [Database](#5-database-mongodb--mongoose) ·
  6. [Authentication & Security](#6-authentication--security) ·
  7. [Redis Caching](#7-redis-caching) ·
  8. [Socket.IO](#8-socketio-real-time-notifications) ·
  9. [Features](#9-important-features--technical-flows) ·
  10. [Performance & Scalability](#10-performance--scalability) ·
  11. [Deployment & DevOps](#11-deployment--devops) ·
  12. [Testing & Debugging](#12-testing--debugging) ·
  13. [Technical Challenges](#13-technical-challenges) ·
  14. [Scenarios](#14-scenario-based-questions) ·
  15. [Why Questions](#15-why-questions) ·
  16. [Cross-Question Drills](#16-cross-question-drills) ·
  17. [HR + Project](#17-hr--project-questions)
- [Part D — Potential Weak Points](#part-d--potential-weak-points)
- [Part E — Technical Keywords Cheat Sheet](#part-e--technical-keywords-cheat-sheet)
- [Part F — Numbers to Remember & Code Map](#part-f--numbers-to-remember--code-map)

---

## Project Fact Sheet (verified from the code)

| Item | Fact |
|---|---|
| What it is | A full-stack college portal: dashboard, academics, community (clubs/events/announcements), discussions, placements, admin |
| Repo layout | Two independent apps: `frontend/` (React client) and `backend/` (Express API); no root workspace |
| Frontend | React 18, React Router 6, Vite 5, Tailwind CSS 4, Axios, socket.io-client, lucide-react |
| Backend | Node.js (ES modules), Express 4, Mongoose 7, Socket.IO 4, jsonwebtoken, bcryptjs, Multer, Cloudinary, Nodemailer, csv-parse, express-rate-limit, Pino |
| Database | MongoDB (**replica set required** — the app uses transactions) |
| Cache | Redis (optional, cache-aside only) |
| Auth | Access JWT (15 min) + refresh JWT (≤ 7 days idle, 30-day absolute session) in **httpOnly, SameSite=Strict cookies**; per-device `Session` documents with hashed, rotating refresh tokens |
| Roles | Global: `student`, `placementCoordinator`, `superadmin`. Resource relationships: class representative, club admin, event organizer |
| API | 15 router mounts under `/api` |
| Collections | 18 Mongoose models in use (+ 1 unused `Resource` model) |
| Real-time | Socket.IO, one room per user (`user:<id>`), 13 notification types, all persisted in MongoDB |
| Tests | **111 backend integration tests in 18 files** — Vitest + Supertest + mongodb-memory-server (in-memory replica set). No frontend tests |
| Logging | Pino structured JSON, one line per request, `X-Request-Id` header |
| Deployment | **Not deployed.** Code is production-aware (config validation, loopback binding, trust proxy, secure cookies, graceful shutdown). No Docker, Nginx config or CI in the repo |
| History | June 2026 → October 2026, single author, 53 commits, 3 merged PRs |

> **Before the interview:** run `npm install && npm test` inside `backend/` on your own machine to confirm the suite passes. (It downloads a MongoDB binary on the first run. It could not be executed in the environment where this guide was written, because that download was blocked.)

---

## Implementation Status Map

Use this to answer "is that implemented?" honestly.

| Area | Status | Notes |
|---|---|---|
| Roster-based account activation, email verification, login, refresh rotation, logout / logout-all, password change and reset | ✅ | `services/auth.service.js` |
| Global roles + resource-level permissions | ✅ | `middleware/*` |
| Rate limiting (login, signup, refresh, forgot password, content, uploads) | ✅ | In-memory store → single process only |
| Origin check, security headers, safe URLs, CSV formula escaping | ✅ | |
| Personalized dashboard + global search | ✅ | `services/dashboard.service.js` |
| Classrooms, timetable, deadlines, semester progression, curricula | ✅ | |
| Clubs (follow/mute), events (register), announcements, community feed | ✅ | |
| Assign club admins / event organizers via UI or API | ⏳ | Set directly in the DB; `EditClub` sends `adminIds` but the API ignores it |
| Discussions: search, votes, bookmarks, comments, nested replies, accepted answer | ✅ | Cursor pagination for comments/replies |
| Placement drives, eligibility, applications, rounds, CSV shortlist, finish/cancel | ✅ | |
| Roster CSV import, academics/year updates | ✅ | |
| Notifications (stored + Socket.IO push, mute) | ✅ | No auto-refetch after socket reconnect |
| Redis caching with fallback and metrics | ✅ | No stampede protection |
| Structured logging, graceful shutdown | ✅ | |
| Request schema validation library (Joi/Zod) | ⏳ | `middleware/validateMiddleware.js` is an empty stub; validation is manual |
| Competitive prep resources | 🟡 | Frontend-only prototype; no backend route; `Resource` model unused |
| Moderation queue | ⏳ | Placeholder (per README) |
| Frontend tests, E2E tests, load tests | ⏳ | |
| Deployment (AWS EC2, Nginx, S3, CloudFront, HTTPS), CI/CD | ⏳ | Planned; code already enforces production settings |
| Multi-instance scaling (shared rate-limit store, Socket.IO Redis adapter) | ⏳ | Seams noted in code comments |

---
# Part A — Top 30 Most Likely Questions (Quick Revision)

Short answers for last-minute revision. The full answer is in the linked question.

**1. Tell me about your project.** → Q1–Q3
A MERN college portal that combines classes, clubs, events, discussions, notices and placements into one **personalized dashboard**, with **cookie-based JWT auth**, **role + resource-level permissions**, **Redis cache-aside**, and **Socket.IO** notifications.

**2. What problem does it solve, and for whom?** → Q4
Campus information is scattered. Students, class reps, club admins, placement coordinators and a superadmin each get the workflows they need in one system.

**3. What was your role?** → Q6, Q188
Solo project: data model, API, React frontend, auth, caching, real-time, tests. *(Be ready to discuss AI-assisted commits honestly — Q197.)*

**4. Explain the architecture.** → Q10
React SPA → Axios (cookies) → Express middleware → routes → controllers/services → Mongoose → MongoDB; Redis as optional cache; Socket.IO for pushes; Cloudinary for uploads; SMTP for emails.

**5. Walk through one request end to end.** → Q11
Event registration: logger → security headers → CORS → **origin check** → JSON → cookies → **authMiddleware** → controller checks → **atomic conditional `$push`** → 201 or 409 → error middleware if anything throws.

**6. Why MongoDB?** → Q175
Document-shaped data (drive + rounds, classroom + periods, application + timeline), evolving schema, JSON end to end — while using **references, unique indexes and transactions** for the relational parts. PostgreSQL would also have worked.

**7. Explain the authentication flow.** → Q73
Roster **claim email** → set password in a **transaction** → login sets **access + refresh cookies** → middleware verifies access token → 401 triggers **refresh with rotation** → logout deletes the session.

**8. Access token vs refresh token?** → Q75, Q83
Access: 15 min, `{id}`, checked every request. Refresh: `{id, sid, jti}`, rotates each use, stored as **SHA-256 hash** in a `Session`; **reuse revokes the session**.

**9. Why httpOnly cookies, not localStorage?** → Q76
JavaScript can't read httpOnly cookies, so XSS can't steal tokens; `Secure` + `SameSite=Strict`; refresh cookie scoped to `/api/auth`.

**10. Authentication vs authorization; how does RBAC work?** → Q74, Q77
AuthN = `authMiddleware` (401). AuthZ = `roleMiddleware` for global roles + **relationship checks** (class rep, club admin, event manager) (403).

**11. How are passwords stored?** → Q78
**bcrypt cost 12** in a `pre("save")` hook, `select: false`, 8–72 bytes, can't equal email or roll number.

**12. Middleware and error handling?** → Q41–Q43
`asyncHandler` forwards async errors; `errorMiddleware` maps known errors (ApiError, 11000→409, CastError→400, JWT→401, DB down→503) and hides internal messages.

**13. How did you design the schema?** → Q55–Q56
Embed small owned data (periods, rounds, timeline); reference large or independently queried data (comments, replies, applications).

**14. Which indexes did you add?** → Q57
Unique (email, rollNumber, `{student, drive}`), keyset (`{discussion, createdAt, _id}`), membership (`registeredEvents`, `followedClubs`), feed indexes, text index on drives, TTL indexes on sessions and tokens.

**15. How does pagination work?** → Q58
Offset with `_id` tie-breaker for page lists; **keyset cursor** `"<createdAt>_<id>"` with **limit + 1** for comments/replies.

**16. Give an aggregation example.** → Q59
Events list: `$match` → `$facet` (count + data) → `$switch` tier (ongoing/upcoming/completed) → sort → skip/limit → `$lookup` clubs.

**17. What if two users update the same data?** → Q166
Atomic `$addToSet`/`$pull`, conditional updates (`$ne` in filter, check `matchedCount`), unique indexes, compare-and-set for round advance, transactions for multi-document writes.

**18. Where do you use transactions?** → Q60
Account activation, password change/reset + session revoke, follow + follower count, roster + user academics, shortlist and finish drive. Requires a **replica set**.

**19. Why Redis and how does cache-aside work?** → Q93–Q95
Shared, rarely changing reads (clubs, upcoming events, search, classroom data, drive catalogue). Check cache → miss → DB → `SET` with **TTL** → write path deletes the key.

**20. What if Redis is down? How do you invalidate?** → Q96–Q97
`isReady` check bypasses Redis; `disableOfflineQueue` so nothing hangs; reads fall back to MongoDB. Invalidation = delete affected keys after the DB write; TTL bounds staleness.

**21. How do real-time notifications work?** → Q106
Controller calls the notification service (not awaited) → mute filter → `insertMany` → emit `notification:new` to room `user:<id>` → React context updates list, count and toast.

**22. WebSocket vs polling; why Socket.IO?** → Q107, Q179
Server push instead of empty polling requests; Socket.IO adds rooms, reconnection, long-polling fallback and handshake auth.

**23. How do you manage state in React?** → Q25
Context for auth and notifications; page-local `useState` for everything else; no Redux needed.

**24. How does the frontend handle token expiry?** → Q28–Q29
Axios **response interceptor** → one **single-flight** refresh shared by parallel 401s → **Web Locks** across tabs → retry the original request.

**25. CORS, CSRF, XSS and rate limiting?** → Q79–Q82
CORS for our origin with credentials; CSRF via **SameSite=Strict + Origin check**; XSS via React escaping, `safeHref`, `isHttpUrl`, Cloudinary format allow-list; rate limits keyed per email / IP / session / user.

**26. Most challenging problem?** → Q155
Parallel 401s caused refresh-token reuse and logouts; fixed with a shared in-flight refresh and cross-tab Web Locks.

**27. How did you test it?** → Q147–Q149
111 integration tests: Vitest + Supertest + in-memory MongoDB replica set, including **parallel-request race tests**, security tests and query-plan tests.

**28. Is it deployed? What's the plan?** → Q139–Q140
Not deployed yet. Planned: S3 + CloudFront for the SPA, EC2 with Nginx → Node on loopback, MongoDB Atlas, Redis, HTTPS, GitHub Actions CI/CD.

**29. How would it handle thousands of users?** → Q133
Load test first; then multiple Node processes with a **Redis rate-limit store** and **Socket.IO Redis adapter**, DB-side pagination for drives, queued notification fan-out, Atlas replica set.

**30. What would you improve, and what did you learn?** → Q190–Q191
Deploy + CI/CD, Zod validation, horizontal-scaling prerequisites, job queue, frontend tests. Learned: concurrency is normal, authorization per object, optional dependencies must fail fast, one source of truth for rules.

---
# Part B — Project Explanation Script

A natural script for "Tell me about your project". It takes about **3 minutes** at a relaxed pace. Words in *[brackets]* are cues, not things to say. Don't memorize it word for word — learn the **flow**, then say it in your own words.

### The script

*[Start calmly. Look at the interviewer, not the screen.]*

"My main project is **CampusOS** — a full-stack portal for college life, built with React, Node.js, Express and MongoDB.

The idea came from a simple problem. In college, the information a student needs every day is scattered: the timetable is in one place, club events are on WhatsApp, deadlines are announced in class groups, and placement drives come by email. It's easy to miss something important. *[pause]* So I built one system that knows who you are — your classroom, the clubs you follow, the events you registered for, the drives you're eligible for — and shows you what matters **today**.

*[If there's a whiteboard, draw: Browser → API → MongoDB, with Redis and Socket.IO on the side.]*

It has five areas. **Home** is a personalized dashboard. **Academics** has the classroom timetable and semester deadlines, which the class representative manages. **Community** has clubs, events, announcements and a discussion forum with upvotes, comments and accepted answers. **Career** is the placement module — coordinators create drives with eligibility criteria, students apply, and the coordinator runs the rounds by uploading a CSV shortlist. And **Admin** is where staff manage the student roster, classrooms and notices.

On the technical side, the frontend is a **React** single-page app. It talks to an **Express REST API** through Axios. Authentication uses **JWTs stored in httpOnly cookies** — a short 15-minute access token and a refresh token that **rotates** every time it's used, with one session record per device. Permissions have two levels: **global roles** like superadmin or placement coordinator, and **relationships** — for example, only the class rep of *that* classroom can edit its timetable.

*[Slow down here — this is where you show depth.]*

Two parts I'm proud of. First, **sign-up**: students can't just register. The college roster is imported first, and a student activates their account by proving they own the email on the roster. So nobody can sign up as someone else, and their branch, CGPA and backlogs come from the official data, which matters because placement eligibility depends on them. Second, **concurrency**: things like following a club, registering for an event or applying to a drive are written as **atomic database operations** or **transactions**, so double clicks or two tabs can't create duplicates or wrong counts. I have tests that fire parallel requests to prove it.

For performance, I added **Redis** as a cache for shared data like the club list and upcoming events, using the **cache-aside** pattern — and it's optional, so if Redis goes down the app simply reads from MongoDB. For real-time, **Socket.IO** pushes notifications to each user's own room, and every notification is also saved in MongoDB so nothing is lost when someone is offline.

I tested the backend with **111 integration tests** using Vitest, Supertest and an in-memory MongoDB replica set.

*[Close with honesty and direction.]*

Right now it runs locally. The code is already prepared for production — it validates its configuration and expects to run behind Nginx with HTTPS — and my next step is deploying it on AWS with a CI/CD pipeline. I'm happy to go deeper into any part — the authentication, the placement workflow, or the caching."

### Steering tips

- **End with an invitation** ("happy to go deeper into…"). You're choosing the topics you know best — authentication, placements, caching.
- If they pick **authentication**, go to Q73 → Q83 → Q86.
- If they pick **database**, go to Q55 → Q57 → Q58 → Q60.
- If they pick **"most challenging"**, tell the refresh-token story (Q155) — it has a clear problem, a measured symptom from the commit, a fix and a lesson.

### If they say "Show me the code" — what to open, in order

1. `backend/app.js` — the middleware pipeline and route mounts (2 minutes).
2. `backend/routes/event.routes.js` → `backend/controllers/event.controller.js` `registerForEvent` — a full request with an authorization guard and an atomic write.
3. `backend/services/auth.service.js` — `refreshSession` (rotation + reuse detection) and `verifyAccountClaim` (transaction).
4. `backend/utils/cache.js` + `backend/controllers/club.controller.js` `getAllClubs` — cache-aside.
5. `backend/services/notification.service.js` + `backend/sockets/socketHandler.js` — notifications.
6. `frontend/src/api/axios.js` — interceptor and single-flight refresh.

### Recovery lines (when you're stuck)

- "I haven't implemented that yet, but here's how I'd approach it: …"
- "I don't remember the exact number, but the idea is …, and I'd confirm it in `<file>`."
- "That's a fair point — that's one of the known limitations. The trade-off I made was …, and the fix would be …"

---
# Part C — Full Question Bank

Every answer below is written in first person, the way you would say it. Bold words are the keywords to remember. `Code:` lines point to where you can re-read the real implementation before the interview.

---

## 1. Project Introduction

### Must Know

**Q1. Explain your project in 30 seconds.**

CampusOS is a **full-stack college portal** I built with the **MERN stack**. It brings classes, clubs, events, discussions, notices and placement drives into one place. When a student logs in, one **personalized dashboard** shows today's classes, registered events, upcoming deadlines, eligible placement drives and important notices. The backend is an **Express + MongoDB REST API** with **cookie-based JWT authentication**, role-based and resource-level permissions, **Redis caching** for shared data, and **Socket.IO** for live notifications.

**Q2. Explain it in 1 minute.**

In most colleges, information is scattered: timetables in one place, club events on WhatsApp, placement updates over email, notices on boards. Students miss deadlines and drives because of that. CampusOS puts it all in one workspace.

It has five areas. **Home** is a personalized dashboard. **Academics** has the classroom timetable, semester deadlines and classroom notices. **Community** has clubs, events, announcements and a Q&A-style discussion forum. **Career** lets students browse placement drives with automatic eligibility checks, apply once, and track each recruitment round. **Admin** is where staff manage the student roster, classrooms, curricula and notices.

Technically, the frontend is **React 18 with Vite**, the backend is **Node.js and Express**, data is in **MongoDB through Mongoose**. Login uses **access and refresh JWTs in httpOnly cookies**, with per-device sessions. **Redis** caches shared reads like the club list, and **Socket.IO** pushes notifications in real time. I also wrote **111 backend integration tests** using Vitest, Supertest and an in-memory MongoDB replica set.

**Q3. Explain it in 2–3 minutes (detailed version).**

*Problem.* CampusOS is a single portal for campus life. The problem I wanted to solve was that a student's day depends on information from many sources — class timetable, club events, deadlines, placement drives — and nothing connects them.

*Users.* There are three global roles: **student**, **placementCoordinator** and **superadmin**. On top of that there are **relationship-based permissions**: a student can be the **class representative** of one classroom, an **admin of a club**, or an **organizer of an event**. So permissions are not only "what role are you" but "what is your relationship to this exact resource".

*Features.* The **dashboard** is built by one backend endpoint that merges today's class periods, registered events and placement rounds into one sorted timeline, plus a "Don't miss" list of drives and events closing today or tomorrow. In **Career**, a coordinator creates a drive with criteria like minimum CGPA, branches, year and backlogs. Students see only what they are eligible for, apply once, and the coordinator runs rounds — ends a round, uploads a **CSV shortlist**, previews it, confirms it, then advances to the next round. In **Community**, students follow clubs, register for events, and use discussions with upvotes, bookmarks, comments, nested replies and accepted answers.

*Architecture.* The React client talks to the Express API using **Axios** with cookies. Each request goes through middleware — request logging, security headers, CORS, an **Origin check**, JSON parsing, cookie parsing — then route-level **auth and permission middleware**, then a controller or service, then Mongoose. Redis sits beside MongoDB as an **optional cache-aside layer**: if Redis is down, the app just reads MongoDB.

*Engineering highlights.* Two things I am proud of. First, **authentication**: students can't just sign up — they activate an account by proving they own an email that's on the college **roster**, so nobody can register as someone else. Refresh tokens **rotate** on every use and a reused token revokes the session. Second, **race safety**: follows, event registrations, votes and drive applications are written as **atomic conditional updates** or **transactions**, so double clicks or parallel requests can't create duplicates or wrong counts — and I have tests that fire parallel requests to prove it.

*Close.* It runs locally right now; the code is prepared for a single-server production setup behind Nginx, and my next step would be deploying it on AWS with CI/CD.

**Q4. What problem does CampusOS solve, and who uses it?**

It solves **information fragmentation** on campus. A student shouldn't have to check five places to know what's happening today. Users are:
- **Students** — dashboard, classroom, clubs, events, discussions, placements.
- **Class representatives** (a student linked to a classroom) — maintain the timetable, deadlines, classroom notices, and start the next semester.
- **Club admins / event organizers** — manage their club's profile, events, announcements and notices.
- **Placement coordinators** — create drives, run rounds, upload shortlists, correct CGPA/backlogs.
- **Superadmin** — roster import, classrooms, curricula, clubs, platform notices.

**Q5. What are the main features?** (✅ implemented, 🟡 partial, ⏳ not built)

| Area | Features | Status |
|---|---|---|
| Home | Personalized dashboard (today's schedule, don't-miss, deadlines, eligible drives, notices), global search | ✅ |
| Academics | Classroom timetable, deadlines per semester, classroom notices, semester progression, curricula | ✅ |
| Academics | Competitive prep resources page | 🟡 frontend-only prototype, no backend |
| Community | Clubs (follow, mute), events (register, eligibility), announcements, community feed | ✅ |
| Discussions | Posts, search, upvotes, bookmarks, comments, nested replies, accepted answer | ✅ |
| Career | Drives with eligibility, applications, rounds, CSV shortlisting, finish/cancel | ✅ |
| Admin | Roster CSV import, academics update, classrooms, curricula, notices | ✅ |
| Admin | Assigning club admins / event organizers from the UI | ⏳ not exposed by the API |
| Platform | Notifications (stored + real-time), email activation, password reset | ✅ |
| Platform | Moderation queue | ⏳ placeholder only |

**Q6. What exactly was your contribution?**

This is a solo project — the repository has a single author. I designed the data model, built the REST API, the React frontend, the authentication and permission system, the caching layer, the real-time notifications and the test suite. *(Adjust this honestly to your real story. The commit history also shows AI-assisted commits — see Q197 for how to talk about that confidently.)*

### Important Follow-Ups

**Q7. How is this different from a WhatsApp group or Google Classroom?**

WhatsApp is a stream of messages — nothing is structured, searchable by type, or personalized. Google Classroom covers coursework only. CampusOS is **structured and personalized**: it knows your classroom, the clubs you follow, events you registered for and drives you're eligible for, so the dashboard shows only what's relevant to you. It also has **workflows**, not just messages — for example, a placement drive has rounds, shortlists and statuses.

**Q8. Why do the package names say "EventSphere"?**

Be honest with your real reason. The README itself says "CampusOS (also named EventSphere in package names)". A natural answer: *"EventSphere was the earlier name when it was mainly about clubs and events. As the scope grew to academics and placements, I renamed the product to CampusOS but didn't rename the packages and Cloudinary folders, because it's cosmetic and renaming upload folders would break existing file paths."* (Only say the history part if it's true for you.)

### Advanced

**Q9. What is not finished in the project?**

I'd be upfront: the **competitive prep** page is a frontend prototype with no backend; the **moderation queue** is a placeholder; there's **no UI/API to assign club admins or event organizers** (they're set directly in the database); there's **no frontend test suite**, **no CI/CD**, and it's **not deployed** yet. The `Resource` model and `drive.service.js`/`resource.service.js` files are unused stubs. Everything else — auth, dashboard, academics, community, placements, roster, notifications — is implemented and mounted.

Code: `README.md` ("Project status"), `frontend/src/pages/academics/competitive/CompetitivePrep.jsx`, `backend/models/Resource.js`

---
## 2. Architecture

### Must Know

**Q10. Explain the overall architecture.**

It's a **client–server, three-tier** application with two separate apps in one repo.

```
React + Vite (browser)
   │  Axios  /api/*  (cookies)          Socket.IO  (cookie handshake)
   ▼                                          ▼
Express API ── middleware ── routes ── controllers/services ── Mongoose ── MongoDB
                                  │                         └─ Redis (optional cache)
                                  ├─ Cloudinary (uploads)
                                  ├─ SMTP (activation/reset emails)
                                  └─ Socket.IO server (user rooms)
```

The frontend is a **single-page app**. It calls the API over **REST** using Axios with `withCredentials: true`, so the **httpOnly auth cookies** go along automatically. For live notifications, it opens a **Socket.IO** connection that authenticates with the same cookie. On the backend, the layers are **routes** (URL + middleware chain), **middleware** (auth, permissions, rate limits, uploads, errors), **controllers** (request handling), **services** (shared domain logic like auth, eligibility, dashboard, notifications) and **models** (Mongoose schemas and indexes). MongoDB is the **source of truth**; Redis is only a cache.

Code: `backend/app.js`, `backend/server.js`

**Q11. Walk me through a complete request, end to end.**

Let me take "student registers for an event":
1. In `EventDetail.jsx`, `handleRegister` calls `registerForEvent(id)`, which does `api.put('/events/:id/register')`. The browser attaches the `accessToken` cookie.
2. In development, **Vite's proxy** forwards `/api` to port 5000. In production the plan is **Nginx** forwarding to Node on `127.0.0.1`.
3. Express runs global middleware in order: **requestLogger** (assigns an `X-Request-Id`), **securityHeaders**, **cors**, **originCheck** (PUT is state-changing, so the Origin must be our frontend), `express.json()`, `cookieParser()`.
4. The events router runs **authMiddleware**: it reads the cookie, verifies the JWT with the pinned **HS256** algorithm, loads the user from MongoDB, and sets `req.user`.
5. The controller `registerForEvent` loads the event, checks it's not cancelled, registration is still open, and the student's branch/year are eligible.
6. It does **one atomic conditional update**: `User.updateOne({ _id, registeredEvents: { $ne: eventId } }, { $push: ... })`. If `matchedCount` is 0, the student was already registered → **409**.
7. It counts registrations and responds with `201 { success, message, data }`.
8. Any thrown error goes through **asyncHandler** to the central **errorMiddleware**, which maps it to a safe status and message. The request logger writes one log line when the response finishes.
9. Back in React, `applyRegistration` updates the count and the user's `registeredEvents` in AuthContext so other pages agree.

Code: `backend/app.js`, `backend/routes/event.routes.js`, `backend/controllers/event.controller.js` (`registerForEvent`), `frontend/src/pages/events/EventDetail.jsx`

**Q12. How do the frontend and backend communicate?**

Two channels. **REST over HTTP** for everything request/response: a shared Axios instance (`frontend/src/api/axios.js`) with `baseURL` from `VITE_API_URL` and `withCredentials: true`, plus one small API module per resource (`club.api.js`, `career.api.js`, …). And **Socket.IO** for server-to-client pushes, only for notifications. The data format is **JSON**. Auth is **cookies**, not an `Authorization` header — the frontend never touches the token.

**Q13. Explain your folder structure and why you organized it this way.**

The backend is **layered**: `routes/` define URLs and the middleware chain, `middleware/` holds cross-cutting checks, `controllers/` handle the request, `services/` hold logic shared across controllers (auth, eligibility, dashboard, notifications, shortlist), `models/` are schemas, `utils/` are small helpers (ApiError, asyncHandler, cache, transaction), `config/` loads and validates environment and connections. This is **separation of concerns** — for example, eligibility logic lives in one service and is used by the dashboard, drive list, apply endpoint and notices, so they can't disagree.

The frontend is organized by **feature**: `pages/` per workspace (career, clubs, events, discussions…), `components/` for shared layout and UI, `api/` for HTTP wrappers, `context/` for global state, `hooks/` for reusable logic.

**Q14. What is the middleware order in `app.js` and why does it matter?**

`requestLogger → securityHeaders → cors → originCheck (on /api) → express.json → cookieParser → routers → notFound → errorMiddleware`.

Order matters because Express runs middleware **top to bottom**. The logger is first so even a 403 from originCheck, a 429 from a rate limiter, or a 404 gets logged. `originCheck` runs **before the body is parsed**, so a cross-origin write is rejected cheaply. `notFound` comes after all routers so unknown routes get the same JSON error shape, and `errorMiddleware` is last because Express identifies error handlers by their **four arguments** `(err, req, res, next)`. Rate limiters are attached **per route** — login limiters on login, `contentLimiter` and `uploadLimiter` after `authMiddleware` because they're keyed per user.

### Important Follow-Ups

**Q15. Why are `app.js` and `server.js` separate?**

`app.js` builds the Express app only — no database connection, no `listen()`. `server.js` connects MongoDB (and waits for it), starts Redis in the background, creates the HTTP server, attaches Socket.IO, listens, and handles shutdown. The split makes the app **testable**: my tests import `app` directly into **Supertest** without opening a port.

**Q16. What does a standard API response look like?**

Success: `{ success: true, message, data }` via the `sendResponse` helper. Error: `{ success: false, message }`, and for Mongoose validation errors also an `errors` array with field names. The one exception is the upload endpoint, which returns `url` and `publicId` at the top level. One bug I fixed early was some handlers returning `success: true` with a 4xx status — I replaced those with `throw new ApiError(...)`.

Code: `backend/utils/sendResponse.js`, `backend/utils/apiError.js`

**Q17. Why is MongoDB a hard dependency but Redis optional?**

MongoDB is the **source of truth** — without it the app can't answer anything correctly, so `server.js` does `await connectDB()` and **exits** if the first connection fails. It never listens without a database. Redis only holds **copies** of data, so losing it should cost speed, not correctness. If `REDIS_URL` is missing, malformed, or Redis is down, caching is disabled and reads go to MongoDB.

**Q18. How do you manage configuration?**

Everything goes through one module, `config/env.js`. Nothing else reads `process.env`. It **validates at startup** and **fails fast**: it collects every problem, prints them, and exits. For example, `NODE_ENV` is required because it decides whether cookies are `Secure`; JWT secrets must be at least 32 characters and different from each other; in production `CLIENT_URL` must be HTTPS, `HOST` must be loopback and `TRUST_PROXY` must be set. Optional groups like SMTP or Cloudinary must be **all set or none set**. The exported object is **frozen**.

**Q19. Why a monolith and not microservices?**

For a college-scale app built by one person, a **modular monolith** is the right trade-off: one deployment, one database, simple transactions across collections, easy local development and testing. Microservices add network calls, distributed transactions, service discovery and ops overhead that this scale doesn't need. The code is still modular — services and routers per domain — so if one area (say notifications) needed to scale separately, it could be extracted.

### Advanced

**Q20. How do services emit socket events without importing `server.js`?**

`sockets/socketHandler.js` stores the `io` instance in a module variable during `initSocket(io)` and exports `getIO()`. The notification service calls `getIO()?.to(room).emit(...)`. This avoids a **circular import** between `server.js` and the services, and the optional chaining means tests (which never create a Socket.IO server) just skip emitting. The code comment also notes this is the place a **Redis adapter** would plug in for multiple servers.

**Q21. If you had to split this into services, how would you do it?**

Along domain boundaries that already exist: **Auth/Identity** (users, sessions, roster), **Academics** (classrooms, curricula, deadlines), **Community** (clubs, events, announcements, discussions), **Placements** (drives, applications), and **Notifications** (fan-out and sockets). Notifications is the best first candidate, because it's already a side effect behind one service boundary — other services would publish events to a **message queue** and the notification service would consume them. The hard part would be cross-domain data like eligibility, which reads user CGPA and drive criteria.

**Q22. What happens when the server shuts down?**

On `SIGTERM`/`SIGINT`, `server.js` runs a **graceful shutdown** once (guarded against re-entry): `io.close()` disconnects sockets and closes the HTTP server, idle keep-alive connections are dropped, in-flight requests get **10 seconds** to finish before `closeAllConnections()`, then MongoDB is closed, then Redis (`close()` if ready, `destroy()` if it's mid-reconnect), then exit. A **15-second backstop timer** forces exit if anything hangs. An `unhandledRejection` is logged and triggers graceful shutdown with exit code 1; an `uncaughtException` exits immediately because the process may be in a bad state.

Code: `backend/server.js` (`shutdown`)

---
## 3. Frontend (React)

### Must Know

**Q23. Which frontend technologies did you use and why?**

**React 18** for component-based UI, **React Router 6** for client-side routing, **Vite 5** as the dev server and bundler, **Tailwind CSS 4** for styling, **Axios** for HTTP, **socket.io-client** for real-time, and **lucide-react** for icons. Vite gives a very fast dev server using native ES modules and has a built-in **proxy**, which I use to forward `/api` and `/socket.io` to the backend, so in development the app behaves like the same-origin production setup.

Code: `frontend/package.json`, `frontend/vite.config.js`

**Q24. How does routing work?**

`App.jsx` uses `BrowserRouter` and `Routes`. Public routes — login, signup, verify-email, forgot/reset password — have no layout. Everything else is **nested** under one parent route whose element is `<ProtectedRoute><Layout/></ProtectedRoute>`; `Layout` renders the top bar, tab bar, toasts and an `<Outlet/>` where the child page appears. Some routes add `allowedRoles`, like `/career/drives/create` for coordinators and superadmins, and the `/admin` section, which has its own nested routes and an index redirect to `/admin/notices`. A catch-all `*` route shows NotFound. While the initial session check is running, `App` shows a spinner so it doesn't flash the login page.

Code: `frontend/src/App.jsx`, `frontend/src/components/layout/Layout.jsx`, `frontend/src/components/common/ProtectedRoute.jsx`

**Q25. How do you manage state?**

I use **React Context** for the two pieces of truly global state: `AuthContext` (current user, loading, logout, `setUser`, `fetchUser`) and `NotificationContext` (notification list, unread count, toasts, mark-read actions, and the socket listener). Everything else is **page-local state** with `useState`, because most data belongs to one page — the drive detail page doesn't need to share its data with the discussions page. I didn't need Redux: the global state is small, and Context with a few values is simpler. If the app grew, I'd consider **React Query (TanStack Query)** for server-state caching and refetching rather than Redux.

Code: `frontend/src/context/AuthContext.jsx`, `frontend/src/context/NotificationContext.jsx`

**Q26. Which React hooks did you use? Any custom hooks?**

Built-in: `useState`, `useEffect`, `useRef`, `useCallback`, `useContext`, `useId` (for accessible IDs), and `useMemo` in a few pages. Custom hooks:
- `useAuth` / `useNotifications` — read the contexts and throw if used outside the provider.
- `useSocket(enabled)` — creates the socket connection and handles refresh-and-reconnect.
- `useDebounce(value, delay)` — delays search input (400 ms on list pages).
- `useCursorList(fetchPage)` — cursor pagination for comments and replies.
- `useIsClassRep` — asks the backend whether I'm the class rep (it's a relationship, not a role).
- `useNow`, `useDocumentTitle`, `useImageOk`, `useIsClamped` — small UI helpers.

There's also a generic `useFetch` hook that is currently unused.

**Q27. How does API integration work?**

There's one Axios instance in `api/axios.js` with the base URL and `withCredentials: true`. Each resource has a small module that only builds requests — for example `discussion.api.js` exports `getComments(id, params)`, `upvoteDiscussion(id)` and so on. Components call these functions and handle loading/error state. A **response interceptor** on the instance handles expired access tokens globally, so no page has to write refresh logic.

**Q28. How does the frontend handle an expired access token?**

The access token lives 15 minutes. When any request gets a **401**, the Axios **response interceptor** checks it's not an auth route and hasn't been retried (`_retry` flag, to prevent infinite loops), then calls `refreshAccessToken()` and **replays the original request**. If refresh fails, the error goes to the caller. The important detail is `refreshAccessToken` is **single-flight**: if five requests fail at the same time, they all share **one** refresh promise. That matters because the server **rotates** refresh tokens — a second refresh with the old token would look like token theft and kill the session.

Code: `frontend/src/api/axios.js` (`refreshAccessToken`, interceptor)

### Important Follow-Ups

**Q29. Why did you use the Web Locks API there?**

Single-flight solves parallel 401s **inside one tab**, but two tabs share the same cookie jar and each has its own JavaScript memory. If both refreshed at once with the same token, the server would treat the second as **reuse**. `navigator.locks.request('campusos:auth-refresh', fn)` makes refreshes **serialize across tabs**: the second tab waits until the first tab's response — and its new `Set-Cookie` — has landed, so it sends the current token. If the browser doesn't support Web Locks, it falls back to calling the function directly.

**Q30. Is `ProtectedRoute` your security?**

No — it's **UX only**. It decides what to render: spinner while loading, redirect to `/login` if there's no user, a Forbidden page if the role isn't allowed. Anyone can modify frontend code in their browser, so **every permission is enforced again on the backend** with `authMiddleware`, `roleMiddleware` and resource checks like `assertClubAdmin`. The frontend just avoids showing buttons that would fail.

**Q31. How do you prevent stale or wasted search requests?**

In the **global search** (`GlobalSearch.jsx`), each keystroke creates a new **AbortController** and aborts the previous one, waits **300 ms**, requires at least 2 characters, and ignores results from an aborted request. On list pages like Events, Drives and Discussions, I use `useDebounce` with 400 ms. The discussions page also applies a response only if it's from the **newest request** and still matches the search box, so an old slow response can't overwrite a newer one.

**Q32. How do you avoid state updates after a component unmounts or responses arriving out of order?**

With **effect cleanup**. The dashboard's effect sets `let cancelled = false` and the cleanup sets it to true, so a late response is ignored. `useCursorList` uses an `aliveRef`, and `useSocket` uses a `disposed` flag so a refresh that finishes after unmount doesn't reconnect. This also matters because **React.StrictMode** (enabled in `main.jsx`) mounts effects twice in development.

**Q33. Why does the dashboard use `Promise.allSettled`?**

The dashboard loads two things in parallel: the personalized `/api/dashboard` and the shared upcoming-events list. With `Promise.all`, if events failed the whole page would fail. With **`Promise.allSettled`**, each result is handled separately — if only the events call fails, the dashboard still renders and the events section just shows nothing, and there's a "Try again" button if the main call fails.

Code: `frontend/src/pages/dashboard/Dashboard.jsx`

**Q34. How do notifications appear on the frontend?**

`NotificationProvider` fetches the first page of notifications and the unread count when a user logs in. It uses `useSocket(!!user)` and listens for `notification:new`. A new notification is added to the list, increments the unread count, and shows a **toast** (only the last 3 are kept). A `seenNotificationIds` **Set** in a ref removes duplicates — for example if a socket event arrives while the initial fetch is in flight. Mark-read is **optimistic**: the UI updates first, and if the API call fails it refetches.

**Q35. How does "Load more" work for comments and replies?**

`useCursorList` is a small hook — one instance for the comment list and one per reply thread, so threads don't affect each other. It stores the **cursor** in a ref, allows **one request at a time** with a `busyRef`, advances the cursor only on success (so a failed page retries as-is), and **dedupes** by `_id`. When the user posts a new comment while older pages are still unloaded, it goes into an `extra` list shown after "Load more", so it doesn't pretend to be in the wrong position.

Code: `frontend/src/pages/discussions/useCursorList.js`

### Advanced

**Q36. What frontend performance work did you do, and what's missing?**

Done: **debounced** and **abortable** search, **pagination** everywhere (offset for lists, cursor for comments), the backend returns **render-ready DTOs** for the dashboard so the client doesn't do heavy joins, skeleton loaders instead of layout jumps, and the dashboard is **one request** instead of many. Missing, and I'd say so honestly: no **code splitting** (`React.lazy`), little memoization, and no client-side server-state cache. With `React.lazy` + `Suspense`, admin and career pages could load only when visited.

**Q37. How do you protect against XSS on the frontend?**

React **escapes text** by default and the codebase has no `dangerouslySetInnerHTML`. The risk left is URLs: React 18 does not block `javascript:` in `href`. So every user-supplied link goes through `safeHref`, which returns the URL only if it's absolute `http:`/`https:`. The backend also validates profile and drive URLs with `isHttpUrl`. When coordinators export applicant lists to CSV, `escapeCsvCell` prefixes cells that start with `=`, `+`, `-`, `@` with `'` to prevent **CSV/formula injection** in Excel.

Code: `frontend/src/utils/safeHref.js`, `frontend/src/utils/csv.js`

**Q38. Any UI or accessibility decisions worth mentioning?**

The global search is an accessible **combobox**: the input keeps focus and points to the highlighted option with `aria-activedescendant`, arrow keys move, Enter opens, Escape closes, and **Ctrl+K / ⌘K** focuses it. The notification panel closes on Escape and returns focus to the bell. Each page sets its document title via `useDocumentTitle`, which screen readers announce. The UI uses a consistent **Tailwind** design system and was audited for responsiveness (a PR was dedicated to that).

---
## 4. Backend (Node.js + Express)

### Must Know

**Q39. Why Node.js and Express for the backend?**

Node.js is good for **I/O-heavy** apps like this — almost every request is "read/write MongoDB, maybe Redis, return JSON". Its **event loop** with non-blocking I/O handles many concurrent requests on one thread. It also lets me use **JavaScript on both sides**, share mental models with React, and use JSON natively with MongoDB. Express is minimal and flexible — I compose exactly the middleware I need: logging, security headers, CORS, auth, permissions, rate limits and a central error handler.

**Q40. How did you design the REST APIs?**

Resources are grouped under `/api`: `/auth`, `/dashboard`, `/clubs`, `/events`, `/announcements`, `/discussions`, `/notices`, `/notifications`, `/classroom`, `/admin/classroom`, `/admin/roster`, `/curriculum`, `/drives`, `/applications`, and `/v1/upload`. I use proper methods and status codes — **201** for creates, **400** bad input, **401** not authenticated, **403** not allowed, **404** not found, **409** conflicts like "already registered", **413** too large, **429** rate limited, **503** database unavailable. For membership-style actions like follow, mute, upvote, bookmark and event registration, I used **PUT to set and DELETE to clear**, which are **idempotent**. Nested resources reflect ownership: `/discussions/:id/comments/:commentId/replies`.

Honest note: some older routes have verbs in the URL like `/events/create` and `/clubs/:clubId/update`; if I cleaned the API I'd make them `POST /events` and `PATCH /clubs/:clubId`.

**Q41. What is middleware? Which custom middleware did you write?**

Middleware is a function `(req, res, next)` that runs in the request pipeline — it can read or modify the request, end the response, or call `next()` to continue. Mine:
- `authMiddleware` — verify the access-token cookie, load `req.user`.
- `roleMiddleware(...roles)` — global role check.
- `classroomAuthMiddleware`, `clubAdminMiddleware`, `eventManagerMiddleware` — **resource-level** checks; they also attach the loaded document (`req.classroom`, `req.club`, `req.event`) so the controller doesn't fetch it again.
- `originCheck`, `securityHeaders` — CSRF defence-in-depth and headers.
- Rate limiters — login, signup, refresh, forgot password, content, upload.
- `upload` (Multer, disk temp) and `uploadCSV` (Multer, memory).
- `requestLogger`, `notFound`, `errorMiddleware`.

**Q42. How do you handle errors in async route handlers?**

Express 4 doesn't catch rejected promises from async handlers. So every handler is wrapped in `asyncHandler`: `(fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)`. Any thrown error or rejection goes to `next(err)` and reaches the central error middleware. In controllers I throw `new ApiError(statusCode, message)` for expected problems.

Code: `backend/utils/asyncHandler.js`, `backend/utils/apiError.js`

**Q43. Explain your central error handler.**

`errorMiddleware` has a `classify()` function that recognizes known errors and maps them to a **safe status and message**:
- `ApiError` → its own status and message.
- Mongo duplicate key `11000` → **409** "`<field>` already exists".
- Mongoose `ValidationError` → **400** with per-field messages; `CastError` (bad ObjectId) → **400** "Invalid ID format".
- JWT `JsonWebTokenError` / `TokenExpiredError` → **401**.
- Multer errors → **413**/400; malformed JSON → 400; body too large → 413.
- Mongo network/server-selection errors or "buffering timed out" → **503** "Service temporarily unavailable".
- Anything else → **500** "Internal server error" — the real message only shows in development.

The principle is **only messages we wrote reach the client**; a third-party `err.message` could leak internals. Unexpected errors are attached to `res.err` so the request logger logs them **once** with the stack and request ID.

Code: `backend/middleware/errorMiddleware.js`

**Q44. How do you validate input?**

I don't use a schema library like Joi or Zod — validation is **manual in controllers** plus **Mongoose schema validators** (required, enum, min/max, maxlength). Controllers check types first (`typeof email !== "string"` → 400), then business rules (dates, eligibility, ownership). Things I always do: accept only strings for query filters, escape regex input, cap lengths (search ≤ 100 chars, content ≤ 10,000), and use **allow-lists** for writable fields. There's an empty `validateMiddleware.js` stub — adding Zod schemas there is a clear improvement because the manual checks are repetitive.

### Important Follow-Ups

**Q45. Why PUT/DELETE for follow and upvote instead of a toggle?**

A toggle is **not idempotent**. If a user double-clicks, or the network retries, two "toggle" requests cancel out — or in a read-modify-write implementation, they can corrupt a counter. With **desired-state** endpoints, `PUT /clubs/:id/follow` always means "I follow it" and `DELETE` always means "I don't". In MongoDB that's `$addToSet` / `$pull`, which are atomic and converge to the same result no matter how many times they run.

**Q46. How do you prevent mass assignment?**

I never pass `req.body` straight into an update. Events use `EVENT_WRITABLE_FIELDS` and drives use `EDITABLE_DRIVE_FIELDS` — explicit lists of what a client may set. Fields like `createdBy`, `status`, `rounds`, `currentRoundId`, `applicationCount` and `eventOrganizers` can only change through dedicated actions. In `updateProfile`, students can only set bio, links, profile picture and resume; trying to set **CGPA, backlogs or name returns 403**, because those come from the roster. In `updateClub`, only a superadmin can change `isActive`.

**Q47. How do you prevent NoSQL injection?**

Express 4's query parser turns `?category[$ne]=x` into an **object** `{ $ne: "x" }`, and a JSON body can contain `{ "email": { "$regex": "." } }`. If that reaches a Mongo filter, it becomes an operator. So every filter value is checked to be a **string** before use — for example login rejects a non-string email with 400, and list endpoints use helpers like `queryString()` or `str()`. The rate limiter's email key also only accepts strings so an object can't become a bucket called `[object Object]`. User text used in `RegExp` goes through `escapeRegex`, so input like `c++` or `(` doesn't throw or cause bad backtracking.

**Q48. How does file upload work?**

`POST /api/v1/upload?folder=<name>`: `authMiddleware` → `uploadLimiter` (20/hour/user) → `validateFolder` (allow-list of 8 folders, checked **before** Multer so a rejected request never writes a temp file) → Multer `diskStorage` into `./public/temp` with limits (5 MB, 1 file, MIME allow-list) → `uploadOnCloudinary` uploads with `resource_type: "image"` and `allowed_formats` (jpg, png, webp, gif, pdf) → deletes the temp file → returns `secure_url`. The MIME type from Multer is client-supplied, so it's only a cheap first gate; the real content check is Cloudinary parsing the bytes, which also blocks SVG/HTML that could carry scripts. The frontend then saves that URL through the normal profile/club/event endpoint.

Code: `backend/routes/upload.route.js`, `backend/middleware/multerMiddleware.js`, `backend/utils/cloudinary.js`

**Q49. How are CSV uploads processed?**

Shortlist and roster CSVs use a separate Multer config with **memoryStorage** and a 2 MB limit, because they're parsed once and discarded — they never need a permanent URL. `csv-parse/sync` parses with `columns: true`, `trim`, `bom` handling and skipping empty lines. Headers are matched **case-insensitively**. For roster import, every row is validated and the response reports `created`, `updated` and `rejected` rows **with row numbers and reasons**.

**Q50. Where do you use async patterns like `Promise.all`?**

Wherever queries are independent. `getProfileData` runs classroom lookup, discussion count, application count and recent applications in **parallel**. The dashboard runs in "waves" — wave 2 fires five queries together. Paginated lists run the page query and `countDocuments` together. Notifications are deliberately **not awaited** in controllers — they're side effects, wrapped in a `safe()` function that catches and logs errors, so a notification failure never fails the main action.

**Q51. How does logging work?**

I use **Pino** — fast, structured **JSON logs** to stdout, pretty-printed in development and silent in tests. `pino-http` writes **one line per request** with method, path (query string removed), status, duration, user ID and a **request ID** generated with `randomUUID()` and returned as the **`X-Request-Id`** header, so a user's error report can be matched to the log. Logging is **whitelisted** — no headers or bodies — and there's a redaction backstop for keys like `password`, `token`, `cookie`, `authorization`. Mongo duplicate-key messages are scrubbed because they include the duplicated email or roll number.

Code: `backend/config/logger.js`, `backend/middleware/requestLogger.js`

### Advanced

**Q52. Does password hashing block the event loop?**

I use **bcryptjs**, which is a pure-JavaScript implementation, with **cost factor 12**. Its async API splits the work into chunks so other requests can interleave, but the CPU work still happens on the **main thread**. Under heavy login traffic that becomes a bottleneck. Options are the native `bcrypt` package or `argon2`, which run hashing on the **libuv thread pool**, or scaling out with more Node processes. The login rate limits also cap how many hashes an attacker can force.

**Q53. Why do some endpoints return 404 instead of 403?**

To avoid **resource enumeration**. For example, `getNoticeById` returns **404** for a classroom notice you can't read, so a student can't confirm that an ID belongs to another classroom. Same for inactive clubs: a non-admin gets 404, not "this club exists but is inactive".

**Q54. Why aren't activation and reset emails awaited?**

Two reasons. **Timing**: if the response waited for SMTP only when the email is on the roster, response time would reveal whether an address exists — an **account enumeration** side channel. And **reliability**: an SMTP failure shouldn't change the response. So `sendAccountClaimEmail(...).catch(logMailFailure(...))` runs in the background, and every request gets the same generic message: "If this address is on the college roster, an activation link has been sent."

---
<!-- SECTION:c5 -->
## 5. Database (MongoDB + Mongoose)

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c5 -->

<!-- SECTION:c6 -->
## 6. Authentication & Security

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c6 -->

<!-- SECTION:c7 -->
## 7. Redis Caching

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c7 -->

<!-- SECTION:c8 -->
## 8. Socket.IO (Real-Time Notifications)

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c8 -->

<!-- SECTION:c9 -->
## 9. Important Features — Technical Flows

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c9 -->

<!-- SECTION:c10 -->
## 10. Performance & Scalability

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c10 -->

<!-- SECTION:c11 -->
## 11. Deployment & DevOps

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c11 -->

<!-- SECTION:c12 -->
## 12. Testing & Debugging

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c12 -->

<!-- SECTION:c13 -->
## 13. Technical Challenges

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c13 -->

<!-- SECTION:c14 -->
## 14. Scenario-Based Questions

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c14 -->

<!-- SECTION:c15 -->
## 15. "Why" Questions

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c15 -->

<!-- SECTION:c16 -->
## 16. Cross-Question Drills

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c16 -->

<!-- SECTION:c17 -->
## 17. HR + Project Questions

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c17 -->

<!-- SECTION:partD -->
# Part D — Potential Weak Points

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:partD -->

<!-- SECTION:partE -->
# Part E — Technical Keywords Cheat Sheet

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:partE -->

<!-- SECTION:partF -->
# Part F — Numbers to Remember & Code Map

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:partF -->

