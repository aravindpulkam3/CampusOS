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
## 5. Database (MongoDB + Mongoose)

### Must Know

**Q55. Explain your main collections and how they relate.**

There are 18 collections in use:
- **Identity:** `User`, `RosterEntry` (authoritative student list), `Session` (one per device), `EmailVerification`, `PasswordReset`.
- **Academics:** `Classroom` (unique per branch + batch + section, with embedded `periods`), `Curriculum` (unique per branch + semester, with embedded `subjects`), `Deadline`.
- **Community:** `Club`, `Event`, `Announcement`, `Discussion`, `Comment`, `Reply`.
- **Placements:** `Drive` (with embedded `rounds`), `Application` (with embedded `timeline`).
- **Messaging:** `Notice`, `Notification`.

Relationships use **ObjectId references**: `User.classroom → Classroom`, `Event.organizerClub → Club`, `Application.student → User` and `.drive → Drive`, `Comment.discussion → Discussion`, `Reply.comment → Comment`. Many-to-many membership is stored as **arrays on User**: `followedClubs`, `registeredEvents`, `mutedClubs`. (There's also a `Resource` model that isn't used yet.)

**Q56. How did you decide between embedding and referencing?**

I **embed** when the child is owned by the parent, small, bounded, and always read with it: classroom `periods`, curriculum `subjects`, drive `rounds`, application `timeline`. One read gets everything, and updates are atomic on one document. I **reference** when the child is unbounded or queried on its own: comments and replies are separate collections because a discussion could have thousands of them and they're **paginated**; applications are separate because they're queried both by student and by drive. Embedding comments would risk the **16 MB document limit** and make pagination hard.

**Q57. Which indexes did you create and why?**

Every index matches a real query:
- **Unique:** `User.email`, `User.rollNumber`, `Club.clubName`, `Classroom {branch, batch, section}`, `Curriculum {branch, semesterNumber}`, `Application {student, drive}` (one application per drive), `Session.tokenHash`.
- **Keyset pagination:** `Comment {discussion, createdAt, _id}`, `Reply {comment, createdAt, _id}`.
- **Membership lookups:** `User.registeredEvents`, `User.followedClubs` (counting registrations and finding followers to notify), `User.classroom`.
- **Feeds:** `Notification {recipient, isRead, createdAt}`, `Notice {targetType, targetId, isArchived, createdAt}` and a second one ending in `expiresAt`, `Announcement {targetType, club|event, createdAt}`, `Deadline {classroom, semesterNumber, dueDate}`, `Event {organizerClub, startDateTime}`, `Drive {status, registrationDeadline}`.
- **Text:** `Drive {companyName, role}` for `$text` search.
- **TTL:** `Session.expiresAt`, `EmailVerification.expiresAt`, `PasswordReset.expiresAt`.

**Q58. How did you implement pagination?**

Two kinds. **Offset pagination** (`skip`/`limit`) for lists where users jump by page or "load more" — discussions, drives, notices, events, notifications, announcements. I always add `_id` as a **tie-breaker** in the sort so equal timestamps can't appear on two pages or be skipped. **Cursor (keyset) pagination** for comments and replies: the cursor is `"<ISO createdAt>_<_id>"` of the last row returned, and the next query asks for rows strictly after it: `createdAt > c` OR (`createdAt == c` AND `_id > id`). I fetch **limit + 1** rows to know if there's another page without a separate count. Keyset is stable when new comments are added between page loads and uses the compound index, so it doesn't slow down on deep pages like `skip` does.

Code: `backend/controllers/discussion.controller.js` (`parseCursor`, `afterCursor`, `fetchPage`)

**Q59. Where did you use aggregation pipelines?**

Three places worth explaining:
1. **Events list** (`getAllEvents`): `$match` (not cancelled, category, search) → `$facet` with one branch counting total records and the other computing a **tier** with `$switch` (1 ongoing, 2 upcoming, 3 completed), a `sortDate` (upcoming nearest first, completed most recent first by negating the end time), then `$sort`, `$skip`, `$limit`, and `$lookup` to the clubs collection with a sub-pipeline that projects only name and logo.
2. **Discussion search**: when searching, `$addFields` computes `titleHits` — how many search words appear in the title using `$regexMatch` — and sorts by that first, **before** skip/limit so pages stay consistent.
3. **Dashboard notices**: `$match` across five audience sources → `$addFields` priority weight → `$sort` pinned, priority, newest → `$limit 5`.

**Q60. Where do you use transactions, and why?**

When **two writes must never diverge**:
- **Account activation**: consume the email token, claim the roster entry, create the user — all or nothing. If the password is rejected, nothing is saved and the link still works.
- **Password change/reset**: write the new password and delete all sessions together.
- **Club follow**: `User.followedClubs` and `Club.followerCount` update together.
- **Roster academic update**: `RosterEntry` and the linked `User` get the same CGPA/backlogs.
- **Shortlist confirm and finish drive**: mark the round processed and update all applications.

MongoDB transactions need a **replica set**, so the README requires one, and tests use an in-memory replica set. `utils/transaction.js` uses `session.withTransaction()`, which also **retries transient errors**.

### Important Follow-Ups

**Q61. How do you stop a student applying twice to the same drive?**

At the **database level** with a **unique compound index** `{ student: 1, drive: 1 }` on `Application`. The controller just calls `Application.create`; if two requests race, one gets error code **11000** and I return **409** "You have already applied". Checking first and then inserting would have a race window — the unique index closes it.

**Q62. What are TTL indexes and where did you use them?**

A **TTL index** tells MongoDB to delete documents automatically after a date field passes. I set `expireAfterSeconds: 0` on `expiresAt` for `Session`, `EmailVerification` and `PasswordReset`, so expired sessions and links clean themselves up. One detail: MongoDB's TTL monitor runs in the background (about once a minute), so deletion isn't instant. That's why the code also checks `expiresAt: { $gt: now }` in the actual query — the TTL index is cleanup, not the security check.

**Q63. `populate` vs `$lookup` — and how did you avoid N+1 queries?**

`populate` is Mongoose doing a **second query** with `$in` on the referenced IDs and stitching results in; `$lookup` is a join **inside** the aggregation pipeline. I use `populate` for normal finds and `$lookup` inside the events aggregation. To avoid **N+1**, I never query per item in a loop. For example, notices have a polymorphic `targetId` (club, event or drive), so I group notices by type and run **at most three populates** — one per model. Notifications to many users use one `insertMany`, not one insert per user.

**Q64. Why do you use `.lean()`?**

`lean()` returns **plain JavaScript objects** instead of full Mongoose documents — no getters, setters, change tracking or `save()`. It's faster and uses less memory, which is right for read-only responses. I don't use it when I need to modify and `save()` the document, or when I rely on document methods like `classroom.periods.id(...)`.

**Q65. Why is the event registration count derived, but the club follower count stored?**

Registration lives in **one place** — `User.registeredEvents` — and the count is `User.countDocuments({ registeredEvents: eventId })`, backed by an index. With no counter, there's nothing to get out of sync. Earlier the event had a stored `registrationCount`, and a migration removed it. For clubs, the popular-clubs list **sorts by** follower count, and counting for every club on every request is expensive, so `followerCount` is stored — but it changes only inside a **transaction** together with the membership, and only if membership actually changed. There's also a `reconcileFollowerCounts.js` script that recalculates counts from the real relationships, because the older toggle implementation could inflate them.

**Q66. How do deletes work for discussions and comments?**

**Soft delete** — set `isDeleted: true`. Reasons: replies under a deleted comment should still make sense, counts must stay correct, and it allows moderation later. Every read filters `isDeleted: false`. The delete is **idempotent**: `updateOne({ _id, isDeleted: false }, { $set: { isDeleted: true } })`, and the parent's `commentCount`/`replyCount` is decremented only if `matchedCount === 1`, so deleting twice never double-decrements.

**Q67. Why is CGPA `null` by default instead of 0?**

Because "not provided" and "0" mean different things. If CGPA were 0 by default, eligibility would say the student fails every drive with a minimum CGPA. With `null`, the eligibility service knows it **can't evaluate** and tells the student to get their CGPA on file instead of lying. Backlogs work the same way, but more leniently: unknown backlogs **skip** that criterion so an opportunity isn't hidden.

**Q68. Which Mongoose middleware/hooks do you use, and what's the gotcha?**

`User` has a `pre("save")` hook that hashes the password with bcrypt if it was modified, and a `comparePassword` method. `Announcement` has a `pre("validate")` hook ensuring a club announcement has a club and an event announcement has an event. The **gotcha**: `pre("save")` does **not** run for `updateOne`, `findByIdAndUpdate` or `$set`. If I set a password that way, it'd be stored in **plain text**. So the auth service has a comment rule: always assign `user.password` and call `save()`.

### Advanced

**Q69. How does the shortlist step prevent double processing?**

Inside the transaction, the first write is a **guard**: `Drive.updateOne({ _id, "rounds._id": roundId, "rounds.processedAt": null }, { $set: { "rounds.$.processedAt": now } })`. If `modifiedCount !== 1`, it throws **409** "already processed". That makes the round a one-shot operation. A precise improvement I'd make: two separate array conditions can be satisfied by **different array elements**, so the strict form is `rounds: { $elemMatch: { _id: roundId, processedAt: null } }`. The controller also checks `processedAt` before calling, so this only matters under a real race — but `$elemMatch` is the correct pattern.

Code: `backend/services/shortlist.service.js` (`applyShortlist`)

**Q70. What's the difference between `withTransaction` and `withOptionalTransaction`?**

`withTransaction` (`utils/transaction.js`) has **no fallback** — if transactions aren't supported, the request fails. It guards pairs of writes that must never diverge, like a roster entry and its user. `withOptionalTransaction` in the shortlist service **falls back** to running without a session on a standalone MongoDB; the `processedAt` and `status` guards still prevent duplicates, just without cross-collection atomicity. Honestly, I'd remove the fallback now that the app requires a replica set anyway, so behaviour is the same everywhere.

**Q71. How do you know your indexes are used?**

I tested it. `discussions.test.js` has a "query plans" test that runs `.explain("queryPlanner")` on the comment and reply page queries and asserts the winning plan uses `discussion_1_createdAt_1__id_1` / `comment_1_createdAt_1__id_1` and has **no in-memory `SORT` stage**. Another test checks the event count uses the `registeredEvents` index. In general, I'd use `explain("executionStats")` and look for `IXSCAN` instead of `COLLSCAN`, and compare `totalDocsExamined` with `nReturned`.

**Q72. How do deadlines and notices stay "per semester" without a Semester collection?**

A classroom holds only its **current** semester: `currentSemesterNumber`, `curriculum` and `periods`. When a new semester starts, those are **overwritten** and the timetable is cleared. Deadlines and classroom notices store a **snapshot** `semesterNumber` at creation. Queries filter `semesterNumber: currentSemesterNumber`, so old deadlines naturally stop showing. Old-semester deadlines become read-only — you can't edit them because their subject may no longer exist in the current curriculum. It's a deliberate, documented trade-off: simpler model, no timetable history.

---
## 6. Authentication & Security

### Must Know

**Q73. Explain the full authentication flow.**

1. **Signup (claim):** the student enters only their college email. If it's on the **roster**, the server creates a random 32-byte token, stores only its **SHA-256 hash** in `EmailVerification`, and emails a link `…/verify-email#token=…`. The response is the **same for every email**, so it doesn't reveal who's on the roster.
2. **Verify:** the student sets a password. In **one transaction**, the server atomically consumes the token (`findOneAndDelete`), checks the roster entry, validates the password, claims the entry (`claimedBy: null` condition) and creates the user with identity data **from the roster**, not from the request.
3. **Login:** email + password → bcrypt compare → must be email-verified → create a **Session** document → set two **httpOnly cookies**: `accessToken` (15 min, path `/`) and `refreshToken` (path `/api/auth`).
4. **Each request:** `authMiddleware` verifies the access token and loads the user.
5. **Refresh:** on 401, the client calls `/api/auth/refresh`; the server **rotates** the refresh token.
6. **Logout:** deletes that session and clears cookies; **logout-all** deletes all sessions and disconnects sockets.

**Q74. What's the difference between authentication and authorization in CampusOS?**

**Authentication** = who you are. That's `authMiddleware` verifying the JWT and loading `req.user`. **Authorization** = what you're allowed to do. CampusOS has two layers: **global roles** with `roleMiddleware("superadmin")` etc., and **resource-level permissions** based on relationships — `classroomAuthMiddleware` checks you're **that** classroom's representative, `assertClubAdmin` checks you're in **that** club's `clubAdmins`, `canManageEvent` checks superadmin, listed organizer, or admin of the organizing club. Authentication failure is **401**, authorization failure is **403**.

**Q75. Explain your JWT setup — access vs refresh tokens.**

Both are **HS256**-signed JWTs with **different secrets**. The **access token** contains just `{ id }`, lives **15 minutes**, and is checked on every request. The **refresh token** contains `{ id, sid, jti }` — `sid` is the Session document's ID, `jti` is random so every token is unique — and lives up to **7 days** (idle timeout). The **session itself** has an absolute limit of **30 days** from login that refreshing never extends. The algorithm is **pinned** on verify (`algorithms: ["HS256"]`) so a token with a different algorithm, like `none`, is rejected.

Code: `backend/utils/generateToken.js`, `backend/services/auth.service.js`

**Q76. Why store tokens in httpOnly cookies instead of localStorage?**

**localStorage is readable by any JavaScript** on the page, so one XSS bug would let an attacker steal the token. An **httpOnly** cookie can't be read by JavaScript at all. The cookies are also `Secure` in production (HTTPS only) and **`SameSite=Strict`**, so the browser won't send them on cross-site requests. The refresh cookie is scoped to `path=/api/auth`, so it's only ever sent to the auth routes that need it. The trade-off is that cookies bring **CSRF** risk, which I handle separately.

**Q77. How does RBAC work here?**

Three global roles in `User.role`: `student`, `placementCoordinator`, `superadmin`. `roleMiddleware(...allowedRoles)` returns 403 if your role isn't in the list — e.g. drive management needs `placementCoordinator` or `superadmin`, roster import needs `superadmin`, and CGPA corrections allow both. But a pure role system can't express "class rep of **this** classroom", so those are **relationships stored on the resource** (`Classroom.classRepresentative`, `Club.clubAdmins`, `Event.eventOrganizers`) and checked by resource middleware. Superadmin passes every resource check.

**Q78. How are passwords stored?**

Hashed with **bcrypt, cost factor 12**, in a Mongoose `pre("save")` hook; the field has `select: false` so it never comes back from queries unless explicitly requested. bcrypt adds a **salt** automatically. Password rules are in one function `validateNewPassword`: **8 to 72 bytes** — 72 because bcrypt ignores anything after 72 bytes, so I reject longer passwords instead of silently truncating — and it can't be your email, email prefix, or roll number. Changing password also requires a different password from the current one.

**Q79. How is CORS configured?**

`cors({ origin: env.clientUrl, credentials: true })` — only our frontend origin is allowed, and `credentials: true` lets the browser send cookies. `CLIENT_URL` is normalized to a bare **origin** (no trailing slash or path) because CORS compares it exactly. Important point: **CORS is not CSRF protection** — it controls whether JavaScript can **read** a cross-origin response; it doesn't stop the browser from **sending** a simple request. That's why there's a separate Origin check.

**Q80. How do you protect against CSRF?**

Two layers. Primary: auth cookies are **`SameSite=Strict`**, so the browser doesn't attach them to requests coming from another site. Defence in depth: `originCheck` middleware on `/api` rejects any **state-changing** request (not GET/HEAD/OPTIONS) whose `Origin` header is present and isn't our frontend — this also covers same-site attacks like a sibling subdomain. Requests without an Origin (curl, server-to-server) pass, because they don't carry browser cookies automatically. And GET handlers don't change state — except discussion view counts, which is harmless. I didn't add CSRF tokens; with SameSite=Strict and the Origin check, they'd be redundant for this setup.

Code: `backend/middleware/originCheck.js`

**Q81. How do you protect against XSS?**

On the frontend, React escapes all rendered text, there's no `dangerouslySetInnerHTML`, and `safeHref` blocks `javascript:` links. On the backend, links that get rendered for other users — profile links, resume URL, drive application link, brochure, logo — must pass `isHttpUrl` (absolute http/https only). Uploads go through Cloudinary as `resource_type: "image"` with an allow-list, which blocks **SVG and HTML** files that could contain scripts. API responses carry `Content-Security-Policy: default-src 'none'` and `X-Content-Type-Options: nosniff`. And tokens are httpOnly, so even an XSS bug couldn't read them.

**Q82. How did you implement rate limiting?**

With **express-rate-limit**, keyed carefully because many students share one campus **NAT IP**:
- **Failed logins per email:** 10 / 15 min from any IP — stops guessing one account.
- **Failed logins per IP:** 100 / 15 min across emails — stops password spraying, generous for a lab.
- Both use `skipSuccessfulRequests`, so normal logins don't count.
- **Signup / verify / reset:** 100 / hour per IP. **Forgot password:** 3 / hour per email, so nobody floods an inbox.
- **Refresh:** 30 / 15 min keyed on the **verified session ID** — not an unverified decode, which would let someone burn a victim's bucket.
- **Content** (posts/comments/replies): 30 / 10 min per user; **uploads:** 20 / hour per user.

It's a temporary 429, not an account lockout. Limits are configurable via `RATE_LIMIT_*` env vars.

Code: `backend/middleware/rateLimitMiddleware.js`

### Important Follow-Ups

**Q83. What is refresh token rotation and reuse detection?**

**Rotation** means every refresh issues a **new** refresh token and the old one stops working. The session stores the SHA-256 of the **current** token. On refresh I do one atomic `findOneAndUpdate` matching `{ _id: sid, user, tokenHash: sha256(incoming), expiresAt > now }` and set the new hash. If the token is validly signed but **doesn't match** the current hash, it means it was used twice — stolen and replayed, or a race — so I **delete the whole session** and log a `refresh_token_reuse` warning. The attacker and the real user both get logged out of that session, which limits damage.

**Q84. Why hash refresh tokens with SHA-256 and not bcrypt?**

bcrypt is slow **on purpose** because passwords are low-entropy and need protection from brute force. Refresh tokens are long **random, high-entropy** values — brute-forcing them is impossible anyway — so a fast hash like SHA-256 is enough, and it lets me **look the session up by the hash** with a unique index. The point of hashing is that a **database leak doesn't give usable tokens**.

**Q85. What happens on logout and logout-all? Is it instant?**

Logout deletes the session matching the refresh cookie (signature still verified, expiry ignored, and it must match `tokenHash`, so an old token can't log out someone else's live session) and clears both cookies. It works even with an expired access token. **Logout-all** deletes every session and calls `disconnectSockets(true)` on the user's Socket.IO room. It's **not fully instant**: an access token another device already holds stays valid for up to **15 minutes**, because access tokens are stateless. That's the accepted trade-off — short access token lifetime keeps the window small.

**Q86. Why roster-based activation instead of open signup?**

With open signup, anyone could register with someone else's roll number or choose their own branch and section — which matters because classroom access and **placement eligibility** depend on them. With roster claim, identity, cohort, CGPA and backlogs come from the **college roster** imported by the superadmin, and the student only proves they **own the email**. It also prevents duplicate accounts: the claim is a conditional update on `claimedBy: null`, and I have a test that fires two activations with the same link in parallel and checks exactly one account is created.

**Q87. How does password reset work securely?**

`/forgot-password` always returns the same message. If the account exists and is activated, it stores the SHA-256 of a random token in `PasswordReset` (one per user, so a new request replaces the old link) with a **30-minute expiry**, and emails a link with the token in the **URL fragment** (`#token=…`). Fragments are **never sent to servers**, so the token stays out of server logs, CDN logs and `Referer` headers; the page reads it and removes it from history with `replaceState`. `/reset-password` runs one transaction: consume the token, set the new password, **delete all sessions**.

**Q88. What security headers do you set?**

On API responses: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` (the API serves JSON, never documents), `Referrer-Policy: no-referrer`, and `x-powered-by` is disabled. I wrote this small middleware instead of using Helmet. The SPA's own headers (its CSP, HSTS) must be set by whatever serves `index.html` — Nginx or CloudFront — and that's part of the deployment plan.

**Q89. What is `trust proxy` and why is `TRUST_PROXY=true` refused?**

Behind Nginx, every request arrives from `127.0.0.1`, so without `trust proxy` all users share **one rate-limit bucket**. With `trust proxy`, Express reads the client IP from `X-Forwarded-For`. But that header can be **forged** by the client, so you must trust only known proxy hops. `true` trusts every hop, which makes rate limiting bypassable, so `env.js` refuses it and asks for a hop count or subnet like `loopback`. In production Node must also bind to `127.0.0.1`, so nobody can connect to it directly and forge the header.

### Advanced

**Q90. What if the JWT secret leaks?**

An attacker could forge access tokens for any user. Response: **rotate** `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` and restart. All existing tokens immediately fail verification, so everyone logs in again; I could also delete all `Session` documents. Prevention: secrets are at least 32 random characters, different from each other (enforced by `env.js`), never committed (`.env` is git-ignored), and in production they'd live in a secrets manager.

**Q91. Give examples of IDOR protection.**

**IDOR** is accessing another user's object by changing an ID. Examples: `getApplicationById` queries `{ _id, student: req.user._id }`, so another student's application returns 404. `markAsRead` filters `{ _id, recipient: userId }`. Deadline update/delete query `{ _id: deadlineId, classroom: classroom._id }`, so a class rep can't edit another classroom's deadline through their own classroom URL. Comments are scoped to their discussion and replies to their comment. `authz.test.js` covers several of these.

**Q92. What security improvements would you add next?**

1. **Schema validation** with Zod on every route. 2. A **shared rate-limit store** (Redis) before running multiple processes. 3. A **CSP and HSTS** for the SPA at Nginx/CloudFront. 4. Consistent `isHttpUrl` validation for every image URL field (club logo/banner, event banner, announcement image currently aren't validated server-side). 5. **Audit logs** for admin actions like roster and CGPA changes. 6. Optional **2FA** for staff. 7. **Dependency scanning** (npm audit / Dependabot) in CI.

---
## 7. Redis Caching

### Must Know

**Q93. Why did you add Redis, and what do you cache?**

Some reads are **shared by every student and change rarely** — the club list, the five upcoming events, classroom academic data, search results. Without a cache, every page load hits MongoDB for the same data. Redis is an **in-memory key-value store**, so reads are much cheaper. I cache only **shared data**:

| Key | TTL | Invalidated by |
|---|---|---|
| `cache:clubs:active` | 24 h | create/update club, follow/unfollow |
| `cache:clubs:popular:active` | 1 h | same as above |
| `cache:events:upcoming` | 15 min | create/update event |
| `cache:search:v2:<normalized query>` | 60 s | TTL only |
| `cache:classroom:<id>:academic` | 1 h | period, semester, classroom and curriculum edits |
| `cache:notices:classroom:<id>` | ≤ 5 min | notice create/delete/pin/archive, semester change |
| `cache:drives:catalog:default` | 60 s | create/update/delete/finish/cancel drive |

I haven't benchmarked the speed-up, so I wouldn't quote a number. The helper does record **hit/miss counters**, which is how I'd measure it.

**Q94. Explain cache-aside with your code.**

**Cache-aside** (lazy loading) means the application owns the cache logic: check the cache; on a **hit** return it; on a **miss** read the database, write the result to the cache with a TTL, and return it. Writes go to the database and then **delete** the key. From `getAllClubs`:

```js
const cached = await getJSON("cache:clubs:active");
if (cached) return sendResponse(res, 200, "...", cached);   // hit
const data = await Club.find({ isActive: true }).lean();   // miss → DB
await setJSON("cache:clubs:active", data, 60 * 60 * 24);   // fill with TTL
```

And in `createClub`, after `Club.create(...)`, it calls `del("cache:clubs:active")` and `del("cache:clubs:popular:active")`. The next read refills them.

Code: `backend/utils/cache.js`, `backend/controllers/club.controller.js`

**Q95. How did you choose the TTLs?**

Based on **how often the data changes** and **how bad stale data would be**. Club details rarely change and writes invalidate them → 24 hours. Popular-club ranking moves with follows → 1 hour. Upcoming events drift as events end even without writes → 15 minutes. Search has many query variants and **isn't invalidated on writes** → only 60 seconds. The drive catalogue is short because applications and deadlines move quickly → 60 seconds. TTL is the **upper bound on staleness** if an invalidation is missed.

**Q96. How does invalidation work?**

**Delete on write**. After the MongoDB write succeeds, the controller deletes the affected key — never updates it in place, because recomputing in two places is error-prone. Keys are scoped so invalidation is **exact**: a notice change deletes only `cache:notices:classroom:<that id>`. A curriculum subject edit finds every classroom using that curriculum and deletes each one's academic key. If the invalidation itself fails, it's logged and swallowed — a saved edit must not turn into a 500.

**Q97. What happens if Redis goes down?**

The app keeps working with caching disabled. `cache.js` checks `redisClient.isReady` before every command; if Redis isn't ready, it **bypasses** Redis and the caller reads MongoDB. The client is created with `disableOfflineQueue: true`, so commands **fail immediately** instead of queueing and hanging the request, and a `reconnectStrategy` that always retries in the background (up to 5 s apart). The outage is logged **once**, and "reconnected, cache re-enabled" is logged when it comes back. At startup, `connectRedis()` is called without `await` and never rejects, so Redis can't block the server from starting.

Code: `backend/config/redis.js`, `backend/utils/cache.js`

### Important Follow-Ups

**Q98. Why don't you cache the dashboard?**

Every section of the dashboard depends on **(this user, right now)**. Caching per user wouldn't be shared, so the hit rate would be low, and the time dependency makes it wrong quickly — something "closing today" cached at 11:50 PM is wrong at 12:01 AM. Instead, the dashboard reuses the **shared** cached classroom data and computes everything else per request.

**Q99. When can users see stale data?**

Cache-aside has known stale windows, and I documented them in the README: (1) if Redis is down during a write, the delete is **skipped**, and the old value lives until its TTL; (2) a **race** — a read misses, reads the old DB value, then a write happens and deletes the key, then the read writes the old value back; (3) search keys aren't invalidated, so results can be up to 60 s old. TTL bounds all of these. Personal data — eligibility, application status, registration — is **never cached**, so it's always live.

**Q100. Why does the drive catalogue cache only some fields?**

`cache:drives:catalog:default` stores only what's needed to **sort and paginate** before personalization: ID, deadline, createdAt and the eligibility criteria. For each request, I still read the student's applications live, compute eligibility and sort weight, paginate, and then **re-read the final page's full documents from MongoDB** — so `applicationCount`, `currentRoundId` and other fields on screen are always fresh. The cache saves the big scan; correctness-sensitive data stays live.

**Q101. Why is the classroom notice TTL dynamic?**

Notices can have an `expiresAt`. If I cached the feed for 5 minutes and one notice expired after 2 minutes, students would keep seeing it. So the TTL is `min(5 minutes, time until the earliest visible notice expires)`. On read, if any cached notice has already expired, it's treated as a miss. The cached rows store only the creator's **ID**, and the name/role is populated live, because a user's name can change. The **permission check runs before the cache read** on every request — the cache never decides who can see a classroom's notices.

**Q102. What if a cached value is corrupted?**

`getJSON` parses the value; if `JSON.parse` fails, it counts a `parseError` and a miss, **deletes that exact key**, and returns null — so the caller reads MongoDB and refills it. If serialization fails on write, it's logged and the request continues. The helper tracks hits, misses, bypasses and errors **per key family** and logs aggregated metrics every minute in development and every five minutes in production — without logging keys, search text or payloads, because a search query is user data.

### Advanced

**Q103. What is a cache stampede and do you handle it?**

A **stampede** (thundering herd) is when a popular key expires and many requests miss at the same moment and all hit the database together. I **don't handle it** today — it's listed as a known limitation. At college scale, with these query sizes, it's acceptable. Fixes would be: a short **lock** in Redis (`SET key:lock NX EX 5`) so only one request refills while others wait or serve stale; **TTL jitter** so keys don't expire together; or **stale-while-revalidate**.

**Q104. Why `disableOfflineQueue` and a custom reconnect strategy?**

That came from a real bug. By default the Redis client **queues commands while disconnected** and waits for reconnect. During an outage, cached GETs **hung**, and club/event writes hung **after** their MongoDB write had already committed — because they were waiting on `del()`. Disabling the offline queue makes commands fail fast so the code falls back to MongoDB. The default reconnect strategy also **gives up permanently** after a socket timeout, so I replaced it with one that always returns a delay (`min(retries × 500, 5000)` ms).

**Q105. How did you design the search cache key?**

The key is built from the **normalized query**: trimmed, lowercased, multiple spaces collapsed — `cache:search:v2:<query>`. The regex is built from the **same normalized string**, otherwise "a  b" (no match) could cache an empty result under the key for "a b". Queries over 100 characters or under 2 return empty before touching cache or DB, so nobody can create unlimited huge keys. The `v2` prefix let me change the result shape without serving old-format entries.

---
## 8. Socket.IO (Real-Time Notifications)

### Must Know

**Q106. How do real-time notifications work end to end?**

Example: a club admin posts an announcement.
1. `createAnnouncement` saves it, then calls `notifyClubFollowers(clubId, actorId, fields)` **without await**.
2. The service finds followers (`User.find({ followedClubs: clubId })`, indexed), removes the actor, and **removes users who muted that club**.
3. It writes all notifications with one **`insertMany`** — MongoDB is the **source of truth**.
4. For each created notification it emits `notification:new` to the room **`user:<recipientId>`**.
5. In the browser, `NotificationContext` receives it, adds it to the list, increments unread count, and shows a toast.
6. If the user was offline, nothing is lost — next time they load the app, `GET /api/notifications` and `/unread-count` return it.

Code: `backend/services/notification.service.js`, `backend/sockets/socketHandler.js`, `frontend/src/context/NotificationContext.jsx`

**Q107. Why WebSockets instead of plain HTTP? Why Socket.IO instead of raw WebSockets?**

HTTP is **request–response** — the server can't speak first. For notifications, the alternatives are **polling** (wasteful: most requests return nothing, and there's a delay) or a **persistent connection** where the server pushes when something happens. WebSocket gives a full-duplex connection over one TCP connection. I chose **Socket.IO** over raw `ws` because it gives **rooms**, automatic **reconnection**, a **fallback to HTTP long-polling** if WebSockets are blocked, handshake middleware for auth, and event names instead of parsing raw messages.

**Q108. What are rooms and how do you use them?**

A room is a server-side group of sockets; emitting to a room sends to every socket in it. On connection, each socket joins **`user:<userId>`**. One user can have several tabs or devices, so a room naturally delivers to all of them, and the service never needs to track socket IDs. Socket.IO removes the socket from rooms automatically on disconnect.

**Q109. How do you authenticate socket connections?**

In `io.use(...)` handshake middleware: parse the `accessToken` cookie from `socket.handshake.headers.cookie`, verify it with the **same** `verifyAccessToken` as HTTP, check the user exists, and store `socket.userId` and the token's `exp`. Bad or expired JWT → `next(new Error("Unauthorized"))`. Any other failure (like the DB lookup) → "Service unavailable", so the client doesn't try a pointless token refresh. Clients connect with `withCredentials: true` so the cookie is sent.

### Important Follow-Ups

**Q110. What happens when the access token expires while the socket is connected?**

The handshake is the only auth check, so a socket shouldn't outlive its token — otherwise a revoked session would keep receiving notifications. On connection the server sets a **timer** to `socket.disconnect(true)` exactly when the token expires. On the client, `useSocket` listens for `disconnect` with reason `"io server disconnect"` and for `connect_error` with "Unauthorized"; in both cases it calls the **shared** `refreshAccessToken()` (never a separate refresh, to avoid refresh-token reuse) and reconnects — once per failure cycle. This fixed a real bug where live notifications silently stopped after 15 minutes until reload.

**Q111. Did you protect the WebSocket handshake from cross-site attacks?**

Yes. CORS only applies to the HTTP long-polling transport; a **WebSocket upgrade isn't subject to CORS**. A malicious site could try to open a socket using the victim's cookies (**cross-site WebSocket hijacking**). So the server has `allowRequest`: if an `Origin` header is present and isn't our frontend origin, the handshake is refused. SameSite=Strict cookies also help.

**Q112. What delivery guarantee do notifications have?**

The **socket push is best-effort** (at most once) — if the user is offline or the socket drops, that emit is gone. But the notification is **written to MongoDB first**, so it's never lost; it's fetched on next app load. One honest gap: after a socket **reconnect**, the client doesn't automatically refetch, so something sent during a short disconnect shows up on the next reload, not instantly. The fix is to call `fetchNotifications()` in the socket's `connect` handler. Also, `markAllAsRead` and per-item read state are stored server-side, so unread counts survive reconnects.

**Q113. How do you avoid duplicate notifications on the client?**

A `seenNotificationIds` **Set** in a `useRef`. Every notification from the initial fetch and every socket event is checked against it; if the ID was seen, it's ignored. When merging the fetch result, notifications that arrived over the socket **during** the fetch are kept on top, and duplicates are removed.

**Q114. How does muting a club work?**

`PUT /clubs/:id/mute` adds the club to `User.mutedClubs` (`$addToSet`). In `createNotificationsBulk`, if a notification has a `sourceClub`, it filters recipients with `mutedClubs: { $ne: sourceClub }`. That's the **only** place mute is checked, and only `notifyClubFollowers` passes a `sourceClub` — so important notifications like application results, classroom deadlines or platform notices **can't be muted** by design.

### Advanced

**Q115. How would you scale Socket.IO to multiple servers?**

Right now there's one Node process, so `io.to(room).emit()` reaches every socket. With multiple instances, a user might be connected to server B while the event is emitted on server A. The fix is the **Socket.IO Redis adapter** (`@socket.io/redis-adapter`), which uses Redis **pub/sub** to broadcast emits across instances — `getIO()` is where it would attach. The load balancer also needs **sticky sessions** if long-polling is used (or force WebSocket-only transport), and Nginx needs the `Upgrade`/`Connection` headers for WebSockets.

**Q116. What's the cost of notification fan-out?**

It's **fan-out on write**: one platform notice creates **one document per user** with `insertMany`, and `notifyAllUsers` loads every user ID into memory. For a college of a few thousand students that's fine, but for much larger numbers it's heavy and runs inside the API process. Improvements: move fan-out to a **background job queue** (BullMQ on Redis) so the request returns immediately and work is retried on failure; batch `insertMany`; or store **one platform notice** and compute per-user read state on read (**fan-out on read**) for broadcast-type messages.

---
## 9. Important Features — Technical Flows

### Must Know

**Q117. How is the personalized dashboard built?**

`GET /api/dashboard` → `buildStudentDashboard(user)`. It runs in **waves** so independent queries run in parallel and dependent ones wait:
- **Wave 1:** the student's applications and their classroom (from the shared cache).
- **Wave 2 (5 parallel queries):** current-semester deadlines due after now; registered events overlapping today; active drives the student is still in; eligible open drives (using the shared eligibility filter); events from followed clubs whose registration closes today.
- **Wave 3:** notices — one aggregation over five sources (platform, my classroom for the current semester, followed clubs, registered events, applied ∪ eligible drives), keeping only pinned/urgent/high or recent (≤ 14 days), sorted pinned → priority → newest, limit 5, then at most 3 grouped populates.
- **Wave 4 (in memory):** merge class periods (stored as **minutes since midnight**), today's events and reachable placement rounds into one **sorted timeline**; build "Don't miss" (eligible unapplied drives closing today/tomorrow + followed-club events closing today); map subject IDs to names.

It returns **render-ready DTOs**, so the frontend only lays them out. Nothing is cached per user.

Code: `backend/services/dashboard.service.js`

**Q118. How do classrooms and the timetable work?**

A `Classroom` is unique per **branch + batch + section** and is created by a superadmin; creating it **backfills** students of that cohort (`User.updateMany`). Students are linked automatically at activation by `findClassroomForUser`. The **class representative** is a field on the classroom, not a user role. Periods are embedded with `day`, `subject` (an ID inside the curriculum's subjects), faculty, room, and `startTime`/`endTime` in **minutes since midnight (0–1439)**. Adding a period validates the day, the time range, that the subject belongs to the **current curriculum**, and checks **overlap** on the same day with `start < other.end && other.start < end` → 409 with the conflicting period ID. Every change invalidates the academic cache.

Code: `backend/controllers/classroom.controller.js`

**Q119. How does "start next semester" work?**

`POST /classroom/:id/semester/next` (class rep or superadmin). The **next number is always derived** on the server (`current + 1`, or 1) — the request body isn't read, so the client can't jump semesters. It fails with 409 if past semester 8 or if no curriculum exists for that branch and semester. Then it sets the new semester number and curriculum and **clears the periods** — deliberately destructive, no history kept. It invalidates the classroom and notice caches. A separate superadmin-only **override** route can set an explicit semester for onboarding or corrections.

**Q120. How do clubs, follow and mute work?**

Students see only **active** clubs (superadmin sees all for approval). Club creation is superadmin-only. Follow/unfollow is `PUT`/`DELETE /clubs/:id/follow` → `setClubFollow` runs in a **transaction**: a conditional `User.updateOne` with the membership condition **in the filter** (`followedClubs: { $ne: clubId }` to follow), and only if it matched, `$inc` the club's `followerCount` by ±1. Then it deletes both club cache keys. A detail I learned: with `timestamps`, Mongoose adds `$set: { updatedAt }` to every update, so `modifiedCount` is 1 even when `$addToSet` changed nothing — that's why I check `matchedCount` with the condition in the filter. Popular clubs = top 5 active by `followerCount`, cached 1 hour.

**Q121. Explain the events feature.**

- **Create:** `POST /events/create` — a route-level guard checks you're admin of the `organizerClub` **in the body**, the body is filtered through an allow-list, dates are validated (end after start, registration deadline ≤ start), the upcoming-events cache is cleared, and followers are notified.
- **List:** the aggregation from Q59 — ongoing first, then upcoming nearest first, then completed most recent first, 15 per page, with search and category filters.
- **Register:** the atomic conditional `$push` from Q11, after checking cancelled status, cutoff (the earlier of deadline and start) and branch/year eligibility. Unregister is a conditional `$pull`, idempotent.
- **Update:** `eventManagerMiddleware` (superadmin, organizer, or club admin); moving the event to another club requires admin rights on **that** club too; registrants are notified.

**Q122. How does the community feed mix announcements?**

`getCommunityFeed` builds three **audience buckets**: announcements of events I registered for, of clubs I follow, and "general" (everything else). Each page targets **20 items** split **8 / 8 / 4**. It counts how many remain in each bucket; if a bucket runs short, the leftover quota is **redistributed** round-robin to buckets that still have items. Each bucket has its **own offset**, returned to the client for the next page. Results are **interleaved** — event, club, general, event, … — and announcements whose club/event was deleted are filtered out. Search and type filters are added **inside** each bucket with `$and`, so they never break the audience rules.

Code: `backend/controllers/announcement.controller.js` (`getCommunityFeed`)

**Q123. How do notices work?**

A notice has a `targetType` — `platform`, `drive`, `classroom`, `clubs`, `events` — plus `targetId`, `priority` (low/normal/high/urgent), `isPinned`, optional `expiresAt` and `isArchived`. **Posting** is checked by `canPost`: platform → superadmin; drive → coordinator or superadmin; classroom → that classroom's rep; clubs → that club's admin; events → anyone who can manage the event. Classroom notices can be scoped to the **current semester** — the client only sends a boolean and the server fills in the number. **Reading** must name a target type — there are two personalized feeds, `community` and `career` — and classroom notices require you to belong to that classroom. Results exclude archived/expired, sort pinned then priority, and return the top 5. Each post fans out notifications to the right audience. Pin, archive and delete are allowed for the **creator or superadmin**.

**Q124. How do discussions work?**

Discussions have categories, tags, views, upvotes, bookmarks, pinned/locked flags and soft delete. The list supports four sorts — **newest, popular (views), unanswered (fewest comments), active (last activity)** — always with pinned first and `_id` as tie-breaker. **Search** splits the query into words; **every word** must appear (case-insensitive, partial words allowed) in the title, content or tags; regex input is escaped; results with more words in the **title** rank first. Opening a discussion increments `views` atomically and returns the **accepted answer**, not the comments; comments and replies are **cursor-paginated** separately. Replies can reply to replies (`parentReply`, `replyingTo` for "@Name") and are rendered as a flat thread. Only the **discussion author** can accept an answer, and the comment must belong to that discussion. Votes are `$addToSet`/`$pull`, and responses return **counts plus my own state**, never the list of who voted.

**Q125. How does drive eligibility work?**

One service, `eligibility.service.js`, is the **single source of truth**. It has two functions that must stay equivalent: `buildEligibilityFilter(user)` produces a **MongoDB query** (min CGPA ≤ mine, minYear ≤ my year ≤ maxYear, branch list empty or contains mine, batch unset or equals mine, max backlogs ≥ mine if known), and `checkDriveEligibility(drive, user)` does the same checks **in memory** and returns **all failing reasons**. The query is used to list eligible drives; the in-memory check is used on apply and detail pages. Before this, there were **five different copies** of the logic that disagreed — a drive could be shown as eligible and then rejected on apply. `getPlacementProfile` handles missing data: no CGPA → can't evaluate, show nothing and ask for it; no backlogs → skip that rule.

**Q126. Walk me through the recruitment round lifecycle.**

A drive has an ordered `rounds` array and a `currentRoundId`. A round's state isn't stored — it's **derived** in `deriveRoundStates` from its position relative to the current round and its `startDate`, `endedAt`, `processedAt`: **upcoming → ongoing → ended_awaiting → processed**. Rules:
1. **Add/edit rounds** any time while active; delete only pending rounds.
2. **Advance to round 1** only after registration closes.
3. **End round** — only the current round, only after its start date.
4. **Shortlist** — preview CSV, then confirm (Q127). This sets `processedAt`.
5. **Advance** — only to the **immediately next** round, only if the current one is ended and processed. It's a **compare-and-set**: `updateOne({ _id, currentRoundId: previous }, { $set: { currentRoundId: next } })`; if it didn't modify, another coordinator moved it first → 409.
6. **Finish** — only when the current round is the last and processed: in a transaction, drive → `completed`, every still-active application → `selected`, and students are notified.
7. **Cancel** — atomic `status: active → cancelled`. It doesn't touch applications, so other code also checks drive status.

Code: `backend/controllers/drive.controller.js`, `backend/utils/roundState.js`

**Q127. How does CSV shortlisting work?**

Two steps so a coordinator can't make a mistake blindly. **Preview** (pure read): parse the CSV, require a `rollNumber` column, normalize to uppercase, and split into buckets — **valid**, **duplicates** in the file, **unknown** roll numbers, students who **never applied**, and students **already rejected/selected**. **Confirm**: the client sends the valid roll numbers, and the server **re-validates against live data** instead of trusting the preview. Then in a transaction: set the round's `processedAt` (the one-shot guard), snapshot who's active, and one **`bulkWrite`** with two `updateMany`s — shortlisted students get a timeline entry and stay `active`; everyone else active becomes `rejected` with a timeline entry. Then both groups are notified.

**Q128. How does roster import work?**

`POST /admin/roster/import` (superadmin, CSV). Steps: parse with case-insensitive headers and check required columns; **validate every row** (email format, batch year, year 1–4, CGPA 0–10, backlogs ≥ 0; blank means "not on file"); reject **every copy** of a roll number or email duplicated in the file; check conflicts against existing roster entries and users. **Unclaimed** entries are written with one unordered `bulkWrite` of upserts filtered on `claimedBy: null` (so an entry claimed in the meantime isn't overwritten). **Claimed** entries can only update year/CGPA/backlogs, in a transaction that updates the roster entry and the linked user together. The response lists `created`, `updated` and each `rejected` row with its spreadsheet row number and reason.

### Important Follow-Ups

**Q129. How does global search work?**

`GET /api/dashboard/search?q=` — 2 to 100 characters. It normalizes the query, checks Redis (`cache:search:v2:<q>`), and on a miss runs **four queries in parallel**: active clubs by name/description, non-cancelled events by name/description, drives by company/role, non-deleted discussions by title — 5 each, all with an **escaped case-insensitive regex**. Results are mapped into one list with `type`, `title`, `subtitle`, `image` and a frontend `url`, cached for 60 seconds. On the frontend it's a combobox grouped by type with keyboard navigation.

**Q130. How do profile and uploads connect?**

The profile page shows roster data (name, roll number, branch, year, CGPA) as read-only and lets the student edit bio, GitHub, LinkedIn, portfolio, profile picture and resume. Images/PDFs are uploaded first through `ImageUploadZone` → `/api/v1/upload?folder=user-profiles` or `student-resumes` (with a 5 MB client-side check), which returns a Cloudinary URL; then `PATCH /auth/profile` saves that URL after `isHttpUrl` validation. `getProfileData` returns stats — clubs followed, events registered, discussions created, applications — computed with parallel queries.

---
## 10. Performance & Scalability

### Must Know

**Q131. What performance optimizations did you implement?**

- **Indexes** for every main query, including compound indexes that match **filter + sort** (comments/replies keyset, notices, notifications, deadlines).
- **Keyset pagination** for comments and replies, and **limits everywhere** — page sizes are capped (e.g. discussions ≤ 50, drives ≤ 100, applicants ≤ 200).
- **Parallel queries** with `Promise.all` and the dashboard's wave structure.
- **No N+1**: grouped populates, `insertMany`, `bulkWrite`, `distinct`.
- **`.lean()` and `.select()`** to fetch only needed fields as plain objects.
- **Redis cache-aside** for shared reads.
- One **dashboard endpoint** instead of many client requests; **debounced, abortable** search on the frontend.

**Q132. Where are the current bottlenecks?**

Being honest about it:
1. `GET /api/drives` loads **all matching drives** into memory, computes eligibility and sort weight per drive, sorts in JavaScript and then slices the page. Fine for hundreds of drives, not for tens of thousands.
2. **Regex search** with unanchored patterns can't use a normal index, so discussion and global search scan documents (bounded by filters and limits).
3. **Notification fan-out** for platform notices writes one document per user inside the request.
4. **bcryptjs** hashing runs on the main thread.
5. **Offset pagination** with `skip` gets slower on deep pages.
6. `authMiddleware` does one `User.findById` on **every** request.

**Q133. How would CampusOS handle thousands of students at once — say, a drive deadline?**

Today it's a **single Node process**, so first I'd measure with a load test (k6 or autocannon) instead of guessing. Things that help already: indexed queries, short responses, cached shared reads, unique index for applications so duplicates are impossible. To scale up: run **multiple Node processes** (PM2 cluster or several containers) behind Nginx or a load balancer — but before that, move **rate-limit counters** and **Socket.IO** to Redis (shared store + Redis adapter), and store uploads directly in Cloudinary instead of a local temp folder. Then use **MongoDB Atlas** with a replica set (reads can go to secondaries for non-critical data), move notification fan-out to a **queue**, and cache the user lookup in auth middleware for a short time.

### Important Follow-Ups

**Q134. How would you find a slow query?**

Look at request durations in the Pino logs (each request line has `responseTime`) to find the slow endpoint, then run the query with `.explain("executionStats")`. I check for `COLLSCAN` vs `IXSCAN`, an in-memory `SORT` stage, and compare `totalDocsExamined` with `nReturned`. Then I add or adjust a compound index following the **ESR rule** — Equality fields first, then Sort, then Range. I already have tests asserting the comment/reply queries have no in-memory sort.

**Q135. What would block horizontal scaling right now?**

Three things are **process-local**: (1) the **rate-limit store** is in memory — the code comment literally says to move to `rate-limit-redis` before scaling out, otherwise each process counts separately; (2) **Socket.IO** has no adapter, so emits only reach sockets on the same process; (3) the **Multer temp directory** is local disk, which is fine per-request but shouldn't be relied on across instances. The cache metrics are also per process. MongoDB and Redis themselves are already shared.

**Q136. Why is `skip` a problem at scale?**

`skip(n)` still makes MongoDB **walk past n documents** — page 1000 reads 1000 × pageSize entries before returning anything. It also has **consistency issues**: if new items are inserted while you page, items shift and you see duplicates or miss some. Keyset pagination fixes both by remembering the last `(createdAt, _id)`. I used keyset where lists are long and append-heavy (comments/replies) and offset where users expect page numbers.

### Advanced

**Q137. How would you make search scale?**

For drives I already use a MongoDB **text index** (`$text`). For discussions I switched **from `$text` to regex** on purpose, because `$text` matches whole stemmed words and users wanted partial matches ("deplo" → "deployment") and all-words matching. The cost is scanning. At scale I'd use **MongoDB Atlas Search** (Lucene-based, supports autocomplete/partial matching with indexes) or Elasticsearch/OpenSearch, keeping the same API response shape.

**Q138. Have you load tested it?**

No, and I wouldn't claim numbers I haven't measured. My testing is functional and concurrency-focused — for example, firing parallel registrations to prove only one succeeds. If I load tested, I'd use **k6** with realistic flows (login → dashboard → drive list → apply), watch p95 latency and error rate, the cache hit/miss metrics the app already logs, and MongoDB's slow query log.

---
## 11. Deployment & DevOps

### Must Know

**Q139. Is the project deployed?**

**No — it currently runs locally.** The repository has no Dockerfile, Nginx config or CI pipeline. What *is* implemented is **production readiness in the code**: `env.js` refuses to start in production unless `CLIENT_URL` is HTTPS, `HOST` is `127.0.0.1`, `TRUST_PROXY` is set, and Cloudinary + SMTP are configured; cookies become `Secure` in production; logs go to stdout as JSON; there's graceful shutdown and crash handling. The README documents a single-VM deployment. *(If you have deployed it yourself, update this answer with the real details.)*

**Q140. What AWS architecture did you plan?** (⏳ planned, not implemented)

```
Browser ──HTTPS──► CloudFront ──┬── /           → S3 (React build: index.html + assets)
                                └── /api, /socket.io → EC2 (Nginx → Node on 127.0.0.1:5000)
EC2 Node ──► MongoDB Atlas (replica set)   ──► Redis (ElastiCache or Redis on EC2)
         ──► Cloudinary (media)             ──► SMTP (e.g. Amazon SES)
```

- **S3 + CloudFront** serve the static React build — cheap, cached at edge, HTTPS with an ACM certificate.
- **EC2** runs Node under a process manager (PM2 or systemd), with **Nginx** as reverse proxy on the same machine.
- **MongoDB Atlas** because transactions need a **replica set** and I don't want to run that myself.
- Putting the API behind the **same CloudFront domain** keeps frontend and API on the **same site**, which `SameSite=Strict` cookies require. In that setup `TRUST_PROXY` would be **2** (CloudFront → Nginx), which the env comment already mentions.

**Q141. Why put Nginx in front of Node?**

**TLS termination**, a **reverse proxy** so Node listens only on loopback, proper handling of the **WebSocket upgrade** for `/socket.io`, gzip, request size and timeout limits, and serving static files if not using S3. It also lets me restart Node behind it. The code depends on this: production requires `HOST=127.0.0.1` so nobody can bypass Nginx and forge `X-Forwarded-For`.

**Q142. How would HTTPS and cookies work in production?**

HTTPS ends at CloudFront/Nginx with an ACM or Let's Encrypt certificate. Because `NODE_ENV=production`, auth cookies get the **`Secure`** flag and are only sent over HTTPS. `SameSite=Strict` means the SPA and API must be on the **same site** — easiest is the same domain with path routing (`/api`, `/socket.io` to the backend). Build the frontend with `VITE_API_URL=/api` **before** `npm run build`, since Vite bakes env values at build time. I'd also add **HSTS** at the edge.

**Q143. How do you handle environment variables and secrets?**

Backend config comes only from `config/env.js`, loaded by `dotenv` from `backend/.env` locally; `.env` files are **git-ignored**. Required values are validated at startup and the process refuses to start with clear messages. Secrets are never logged — even the Redis URL isn't echoed because it can contain a password. The frontend has one variable, `VITE_API_URL`, and anything with `VITE_` is **public** (it's in the bundle), so no secrets there. In production, I'd use **AWS Systems Manager Parameter Store or Secrets Manager**, injected into the environment at start.

### Important Follow-Ups

**Q144. How would you set up CI/CD?** (⏳ planned)

**GitHub Actions**: on every pull request — `npm ci` in backend and frontend, run `npm test` (the in-memory replica set works in CI), run `npm run build` for the frontend, and later lint. On merge to main — build the frontend and sync it to **S3**, invalidate the **CloudFront** cache, and deploy the backend to EC2 (SSH + `git pull` + `npm ci --omit=dev` + PM2 reload, or build a Docker image). Secrets come from GitHub Actions secrets / AWS OIDC. Database migrations like `migratePhase1Auth.js` have `--dry-run` modes and would be run manually against a backup first.

**Q145. What production considerations are already in the code?**

Fail-fast **config validation**; DB-before-listen; **graceful shutdown** with drain timeouts; `unhandledRejection` / `uncaughtException` handlers; **structured JSON logs** with request IDs, no sensitive data; `x-powered-by` disabled and security headers; **trust proxy** validation; production **loopback binding**; secure cookies; and Redis as an optional dependency so a cache outage doesn't take the site down. Missing: a health-check endpoint (the logger even has a comment for where it goes), a process manager config, containerization and monitoring/alerts.

### Advanced

**Q146. What Nginx settings would Socket.IO need?**

The `/socket.io/` location must proxy with HTTP/1.1 and pass the upgrade headers — `proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";` — plus `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for` and `Host`, and a longer `proxy_read_timeout` so idle sockets aren't cut. With more than one Node process, I'd need sticky sessions or WebSocket-only transport plus the Redis adapter. *(This is planned configuration — I haven't deployed it yet.)*

---
## 12. Testing & Debugging

### Must Know

**Q147. How did you test the project?**

The backend has **111 integration tests in 18 files** using **Vitest** as the runner, **Supertest** to send real HTTP requests to the Express `app`, and **mongodb-memory-server** to start an in-memory **MongoDB replica set** (version 7.0) — a replica set because the code uses transactions. Each test file gets a **fresh database**, indexes are built before tests run, and email sending is **mocked** to capture tokens. A helper creates a Supertest **agent** that keeps cookies like a browser and sends a unique `X-Forwarded-For` IP so rate-limit buckets don't leak between tests. Run with `npm test` in `backend/`. There are **no frontend tests** yet.

Code: `backend/vitest.config.js`, `backend/tests/globalSetup.js`, `backend/tests/setup.js`, `backend/tests/helpers.js`

**Q148. Give examples of meaningful tests.**

- **Race tests:** two activations with the same link in parallel → exactly one user created (`claim.test.js`); parallel event registrations → registered once (`eventRegistration.test.js`).
- **Security:** refresh token rotation, reuse revokes the session, logout-all (`auth.test.js`); students blocked from superadmin routes, IDOR on applications and notifications (`authz.test.js`); login rate limits per email across IPs and per IP across emails (`login.test.js`).
- **Pagination:** 45 comments page as 20 + 20 + 5 with **no duplicates or gaps**, even when timestamps tie or comments are added/deleted between pages.
- **Query plans:** asserting the keyset index is used with no in-memory sort.
- **Cache:** corrupted JSON is deleted and refilled; when Redis isn't ready, the API still serves from MongoDB.
- **Logging:** passwords, cookies and auth headers are never logged.

**Q149. How do you test concurrency?**

Fire the requests at the same time with `Promise.all` against the real app and real (in-memory) MongoDB, then check the **final database state**, not just status codes. For example, two activation requests with the same token → status codes sort to `[200, 400]`, `User.find({ email })` has length 1, and the roster entry's `claimedBy` equals that user.

### Important Follow-Ups

**Q150. How do you mock Redis and email in tests?**

Tests set `REDIS_URL` to empty, so normally caching is off. Cache-specific tests use `vi.mock("../config/redis.js")` with a fake client backed by a **Map** and a toggleable `isReady`, so I can simulate Redis being down. Email is mocked in `setup.js` with `vi.mock("../utils/mailer.js")`, pushing `{ type, to, token }` into `globalThis.sentMail` so tests can read the one-time token and continue the flow.

**Q151. How do you debug a production-style issue?**

Start from the **request ID**: every response has `X-Request-Id`, and the log line for that request has method, path, status, duration and user ID, plus the stack for unexpected errors. Then **reproduce** it — ideally as a failing test — fix it, and keep the test. For data issues, check the query with `explain()` or check the documents directly. For frontend issues, browser DevTools Network tab (status, cookies, CORS errors) and the console.

**Q152. What bugs did you find and fix?** (all visible in commit history and code comments)

- Some handlers returned `{ success: true }` with a **4xx status**.
- Searching for `c++` or `(` caused a **500** because user input went into `new RegExp` unescaped.
- `Application.notes` was **missing from the schema**, so Mongoose strict mode **silently dropped** every write.
- `deleteAnnouncement` checked `club.clubAdmin` — a field that doesn't exist — so club admins could never delete.
- The community notice feed used `user.joinedClubs`, which doesn't exist — always undefined.
- **Authorization holes**: any logged-in user could create an event for any club or post announcements to any club.
- **Eligibility** logic existed in five copies that disagreed.
- Parallel 401s caused **refresh-token reuse** and logged users out; sockets stopped after 15 minutes.

**Q153. What isn't tested?**

No **frontend** unit or component tests, no **end-to-end** browser tests, no **load** tests, and not every endpoint has a test. Next I'd add Vitest + React Testing Library for components like `useCursorList` and the Axios refresh logic, and Playwright for key flows (login → apply to drive).

### Advanced

**Q154. How does the system handle failures, and how do you know?**

By design: notifications are side effects wrapped in `safe()`, so failures are logged, not thrown; cache failures fall back to MongoDB; cache invalidation failures are logged; email failures are logged by error code only (the message can contain the address). Database outages return **503**. Crashes are logged at `fatal` before exit. Visibility is through logs only — no metrics or alerting yet, which I'd add (CloudWatch or Grafana) with alerts on 5xx rate.

---
## 13. Technical Challenges

Use the **STAR** structure: Situation → Task → Action → Result. These are real problems visible in the commit history.

### Must Know

**Q155. What was the most challenging problem you solved?**

**The refresh-token race.** *Situation:* after the 15-minute access token expired, the dashboard fired several requests in parallel; all got 401 and each one called `/auth/refresh`. *Problem:* refresh tokens **rotate**, so the second refresh presented an already-rotated token, the server treated it as **theft**, revoked the session, and the user got logged out. The commit records a reproduction: 5 parallel 401s produced 5 refreshes and only 1 of 5 requests recovered. *Action:* I made `refreshAccessToken()` the **single owner** of refresh with a **shared in-flight promise**, so all callers wait on one request, and later added the **Web Locks API** to serialize refreshes **across tabs**. *Result:* after the fix, 1 refresh and 5 of 5 requests recovered. *Lesson:* a security feature (strict rotation) changes what the client must guarantee.

**Q156. Tell me about a concurrency bug you fixed.**

Follows, event registration, votes and drive applications were originally **read-modify-write toggles**: read the document, check the array, then save. Two fast clicks or two tabs could double-count followers or flip state twice. I changed them to **atomic conditional updates** where the condition lives in the filter — `{ _id, followedClubs: { $ne: clubId } }` with `$addToSet` — used `matchedCount` (not `modifiedCount`, because timestamps make that always 1), put follow membership and follower count in a **transaction**, made event registration count **derived**, and relied on a **unique index** for applications. Then I wrote a script to **reconcile** old inflated follower counts, and tests that fire parallel requests.

**Q157. Tell me about a reliability problem.**

**Redis outages hung requests.** The Redis client's **offline queue** held commands while disconnected, so during an outage cached reads hung — and worse, club and event writes hung **after** MongoDB had already committed, because they were waiting on cache deletion. I set `disableOfflineQueue: true`, added a readiness check that **bypasses** Redis when it's not ready, replaced the reconnect strategy because the default gives up permanently, made `REDIS_URL` optional, and made `connectRedis()` never reject. Now a Redis outage only means "slower, no cache". There are tests for the bypass behaviour.

### Important Follow-Ups

**Q158. Tell me about a bug caused by duplicated logic.**

Drive eligibility was implemented in **five places** — dashboard, two notice paths, drive controller and apply — and they disagreed. One used `user.cgpa || 0`, which made students with no CGPA eligible only for zero-cutoff drives; another used `user.cgpa ?? 10`, the opposite, so a drive could be **advertised as eligible and then rejected** on apply. I created one `eligibility.service.js` with a Mongo filter and an in-memory check that evaluate the same rules in the same order, and a `getPlacementProfile` helper that treats missing CGPA honestly. Lesson: **one source of truth** for business rules.

**Q159. Tell me about a pagination bug.**

Lists sorted only by `createdAt` could show the **same item on two pages or skip one** when timestamps tie, and offset pagination shifts when new comments are added. For comments/replies I moved to **keyset pagination** on `(createdAt, _id)` with a matching compound index and the "fetch limit + 1" trick. For offset lists I added `_id` as a tie-breaker everywhere. I wrote tests that seed comments with identical timestamps and insert/delete between pages and check there are no duplicates or gaps.

**Q160. Tell me about a security issue you found in your own code.**

During a review I found **authorization was missing on writes**: any logged-in user could create an event for any club, `$set` arbitrary fields on any event, and post announcements — with notifications to all followers — to any club. I fixed it by extracting one rule (`isClubAdmin`/`assertClubAdmin`, `canManageEvent`), authorizing against the **exact** club the event is written for, adding **allow-lists** of writable fields, and requiring admin rights on the destination club when an event moves clubs. Lesson: **authentication isn't authorization** — every write needs a "may this user do this to this object?" check.

### Advanced

**Q161. A real-time problem you solved?**

Live notifications **stopped silently after 15 minutes**. The socket was authenticated at handshake; when it reconnected after the token expired, the handshake failed with "Unauthorized", and **Socket.IO never retries a middleware rejection**. I made the client refresh through the **shared** single-flight function and reconnect, and the server disconnect sockets when their token expires so a revoked session can't keep listening. I also separated real auth errors from server errors, so a DB failure during handshake doesn't trigger a pointless refresh.

**Q162. What did these challenges teach you overall?**

Three things. **Concurrency is the default** — double clicks, retries and multiple tabs happen, so writes must be atomic or idempotent. **Optional dependencies must fail fast**, or they become hard dependencies. And **business rules need one home** — duplicated logic drifts. I also learned to **reproduce a bug as a test first**, then fix it.

---
## 14. Scenario-Based Questions

### Must Know

**Q163. What happens if MongoDB goes down?**

At **startup**, `connectDB()` fails and the process **exits** — it never serves requests without a database. At **runtime**, the MongoDB driver **reconnects automatically**, and connection events are logged (`disconnected`, `reconnected`). While it's down, Mongoose buffers operations and then they fail; the error middleware recognizes `MongoNetworkError`, `MongoServerSelectionError` and "buffering timed out" and returns **503 "Service temporarily unavailable"** instead of a confusing 500. Even endpoints with cached data fail, because every route is authenticated and `authMiddleware` loads the user from MongoDB on each request — so in practice the API is down until MongoDB is back. With Atlas, a **replica set** gives automatic failover to a secondary, so a single node failure is usually a few seconds of errors.

**Q164. What if Redis fails?**

Nothing breaks — it's **cache-only**. `isReady` is false, so every cache call is skipped and reads go to MongoDB (more DB load, slower). Commands never hang because the offline queue is disabled. The outage is logged once, and when Redis comes back the client reconnects and caching resumes. One side effect: invalidations during the outage are skipped, so a value cached before the outage can be stale until its TTL ends.

**Q165. What happens when a JWT expires?**

**Access token** (15 min): `authMiddleware` throws `TokenExpiredError` → 401 → the Axios interceptor does one shared refresh → retries the original request — the user notices nothing. **Socket**: the server disconnects at expiry → the client refreshes and reconnects. **Refresh token** (7-day idle, 30-day absolute session): refresh returns 401 and clears the cookies → the request fails → the user is effectively logged out and `ProtectedRoute` sends them to login.

**Q166. What if two users update the same data at the same time?**

Depends on the data:
- **Membership-style** (follow, register, vote): atomic `$addToSet`/`$pull` or conditional `$push` — both converge correctly.
- **One-time actions**: a **unique index** (one application per drive), **conditional claim** (`claimedBy: null`), or atomic `findOneAndDelete` for one-time tokens.
- **State machines**: **compare-and-set** — advancing a round only succeeds if `currentRoundId` is still the value I read; the loser gets 409 "please refresh". Shortlist uses a `processedAt` guard in a transaction.
- **Plain edits** (e.g. two coordinators editing a drive's description): **last write wins** — there's no version check. If needed, I'd add **optimistic locking** with a version field and `updateOne({ _id, __v })`.

**Q167. Thousands of students open the platform at 9 AM on placement day. What happens?**

All requests hit one Node process. The shared reads — club lists, upcoming events, drive catalogue, search — come from Redis. Per-user work (dashboard, eligibility) hits MongoDB but uses indexed queries. Applying is safe from duplicates because of the unique index. Likely pain points: the drive list's in-memory processing, CPU for bcrypt if many log in at once, and possibly the campus **shared IP** hitting the per-IP login limit (100 failed attempts / 15 min, successful logins don't count). To prepare I'd load test first, then scale out with the shared rate-limit store, Socket.IO Redis adapter and more processes (Q133).

**Q168. A notification fails to deliver. What happens?**

There are two parts. If the **database insert** fails, `safe()` catches and logs it, and the main action still succeeds — the user just doesn't get that notification (there's no retry queue yet; a job queue would fix that). If the **socket emit** doesn't reach the user (offline, disconnected), the notification is already **stored**, so it appears on the next app load with the correct unread count. The gap: after a brief disconnect, the client doesn't refetch on reconnect, so it shows on reload rather than instantly.

### Important Follow-Ups

**Q169. What if Cloudinary is down during an upload?**

`uploadOnCloudinary` catches the error, deletes the temp file, logs it and returns null; the route throws **502** "File upload failed. Please try again." If Cloudinary rejects the file itself (not a real image/PDF), that's a **400** "Unsupported or corrupted file". The rest of the app is unaffected.

**Q170. What if the SMTP server fails during signup?**

The email is sent **without await**, so the user still sees the standard "if this address is on the roster…" message. The failure is logged with only the error codes. The verification record exists, and after the **1-minute resend interval** (max 5 per day) the student can request a new link. In development without SMTP, links are printed to the console instead.

**Q171. What if someone steals a refresh token?**

If the attacker uses it first, they get a new token — but when the real user's browser refreshes with the old one, it's a **reuse**, so the **entire session is deleted** and both are logged out; the event is logged as `refresh_token_reuse`. If the real user refreshes first, the stolen token is already dead, and using it triggers the same revocation. Limits: the refresh cookie is httpOnly (XSS can't read it), `Secure`, scoped to `/api/auth`, and the user can **log out of all devices**.

**Q172. What if the user has the app open in two tabs?**

Both share cookies. When the access token expires, the **Web Lock** makes one tab refresh first; the other waits and then uses the new cookie (at worst it does one extra valid rotation). Each tab has its own socket in the same `user:<id>` room, so both get notifications. If one tab registers for an event and the other tries too, the server returns 409 and the UI treats it as "already registered" and refreshes the count.

### Advanced

**Q173. The server crashes in the middle of a write. Is data consistent?**

For the critical multi-document writes — activation, password reset, follow + count, roster + user, shortlist, finish drive — they're in **transactions**, so either everything commits or nothing does. Non-transactional pairs are the honest risk: e.g. creating a comment and then incrementing `commentCount`, or creating an application and then incrementing `applicationCount`; a crash between them could make a counter off by one. These are display counters, and the fix would be a transaction or a periodic reconciliation, like the follower-count script.

**Q174. An admin uploads a CSV with mistakes. What happens?**

For the **roster**, nothing is written for invalid rows — each is reported with its row number and reason (bad email, year not 1–4, duplicated in file, belongs to another account, or trying to change a claimed student's identity), and valid rows still import. For **shortlists**, the **preview** shows unknown roll numbers, duplicates, students who never applied and already-decided students before anything changes, and **confirm re-validates** on the server, so a stale preview can't apply wrong data.

---
## 15. "Why" Questions

### Must Know

**Q175. Why MongoDB instead of SQL?**

A few reasons from this project. A lot of the data is naturally **document-shaped**: a drive with its ordered rounds, a classroom with its periods, an application with its status timeline — each is read and updated as one unit, so embedding fits. The schema **changed a lot** while I built it (adding backlogs, sessions, roster), and with Mongoose that was cheap. And it's **JSON end to end** with JavaScript. But I'd be honest: the data is also quite **relational** — users, clubs, events, applications — so I used **references, unique compound indexes and transactions** where consistency matters. **PostgreSQL would have worked well too**; for a heavily relational, reporting-focused version (like placement statistics), SQL joins and constraints would be a strong choice.

**Q176. Why React?**

**Component-based** UI fits this app — cards, feeds, forms and layouts are reused across workspaces. React's **declarative** rendering makes state-driven UI simple (loading, error, empty states), hooks let me extract logic like `useSocket` and `useCursorList`, and the ecosystem (React Router, Axios) is mature. I knew JavaScript already, so the full stack is one language.

**Q177. Why Node.js?**

The workload is **I/O-bound** — database calls, cache calls, HTTP to Cloudinary and SMTP — which suits Node's **non-blocking event loop**. It has first-class support for **Socket.IO**, same language as the frontend, and npm has everything I needed (Mongoose, jsonwebtoken, express-rate-limit, Pino). The trade-off is CPU-heavy work like bcrypt blocks the event loop, which I'm aware of (Q52).

**Q178. Why Redis?**

It's an **in-memory** key-value store with **built-in TTL** (`SET key value EX seconds`), which is exactly what a cache needs. It's the standard choice, and later it can serve other roles this project would need to scale — a **shared rate-limit store**, the **Socket.IO adapter** via pub/sub, and a **job queue** (BullMQ). I deliberately kept it **optional**.

**Q179. Why Socket.IO instead of polling?**

With polling, every client asks "anything new?" every few seconds — thousands of mostly empty requests, plus a delay up to the polling interval. With Socket.IO, the server pushes **only when something happens**, instantly, over one long-lived connection. Socket.IO also handles reconnection, rooms and a long-polling **fallback**. For a notification feature that's a clear win. I still keep a REST endpoint for the list and unread count, so the socket is just the "push" layer.

**Q180. Why JWT? Why not server sessions?**

Actually I use a **hybrid**. The **access token is a stateless JWT** — verified with a signature check, no session-store lookup, and the same token authenticates the socket handshake. The **refresh token is tied to a stateful `Session` document**, so I get what pure JWT lacks: **revocation** (logout, logout-all, password change), **per-device sessions**, and **reuse detection**. A pure server-session approach would also have worked; the hybrid gives short-lived stateless checks with revocable long-lived sessions.

### Important Follow-Ups

**Q181. Why this architecture instead of alternatives?**

A **layered monolith** with a separate SPA: simple to build and deploy alone, transactions across collections are easy, and the frontend can be served from a CDN independently. Alternatives I considered: **server-side rendering with Next.js** — good for SEO, but this is a logged-in app with no SEO need; **microservices** — too much overhead at this scale (Q19); **GraphQL** — useful for flexible queries, but the dashboard endpoint already solves the "many requests" problem with one tailored REST call.

**Q182. Why Cloudinary instead of storing files on the server or S3?**

Storing uploads on the API server's disk doesn't survive redeploys and doesn't scale across instances. Cloudinary gives **CDN delivery**, image transformations, and — importantly — it **inspects the actual file bytes** with `resource_type: "image"` and `allowed_formats`, which blocks disguised files. S3 + CloudFront would also work; I'd then need to do content validation myself.

**Q183. Why Vite instead of Create React App?**

CRA is no longer maintained. Vite's dev server uses **native ES modules**, so startup and hot reload are near-instant, its production build uses **Rollup**, and it has a simple **proxy** config I use for `/api` and `/socket.io`.

**Q184. Why Mongoose instead of the native MongoDB driver?**

**Schemas and validation** (required, enum, min/max), **middleware hooks** (password hashing), `populate` for references, and index definitions next to the schema. The trade-off is some magic — for example, update queries bypass `save` hooks, and `timestamps` changes what `modifiedCount` means. I hit both and handled them.

**Q185. Why Tailwind CSS?**

Utility classes keep styles next to the markup, make a **consistent design system** easy (spacing, colors, radii), and the build only ships classes that are used. It made the responsive redesign faster than maintaining separate CSS files.

### Advanced

**Q186. Why Vitest + Supertest + in-memory MongoDB instead of mocking the database?**

Most of my important bugs were about **real database behaviour** — unique indexes, transactions, conditional updates, `matchedCount` vs `modifiedCount`, query plans. Mocking Mongoose would hide exactly those bugs. An **in-memory replica set** runs the real MongoDB engine with transactions, Supertest exercises the real middleware chain, and Vitest is fast, ESM-native and has a Jest-compatible API.

---
## 16. Cross-Question Drills

Interviewers dig deeper on whatever you say. Practice these chains out loud — each follow-up is what usually comes next.

**Drill 1 — "You used JWT."**
- *"Where is it stored?"* → httpOnly cookie, not localStorage, so JavaScript can't read it.
- *"Then how is it sent to the API?"* → The browser attaches cookies automatically; Axios uses `withCredentials: true`; CORS allows credentials for our origin only.
- *"Cookies mean CSRF. How do you stop it?"* → `SameSite=Strict` plus an Origin check on every state-changing request.
- *"If you load the user from the DB on every request anyway, why JWT at all?"* → The DB read gives fresh role and state (role changes apply immediately, deleted users are blocked). The JWT avoids a separate session-store lookup and also authenticates the socket. If the user lookup became a bottleneck, I'd cache it briefly in Redis.
- *"How do you revoke an access token?"* → I can't before expiry; that's why it lives only 15 minutes. Revocation happens at the session (refresh) level.

**Drill 2 — "You used Redis caching."**
- *"What happens on a write?"* → Write MongoDB first, then delete the key.
- *"Why delete instead of update?"* → Avoids computing the cached value in two places and avoids writing an old value in a race; the next read rebuilds it.
- *"What if the delete fails?"* → It's logged; the stale value lives at most until the TTL.
- *"So a user can see stale data?"* → For shared, non-critical lists, yes, for a bounded time. Personal data like eligibility and applications is never cached.
- *"Why not cache the dashboard then?"* → It's per user and time-dependent (Q98).

**Drill 3 — "You used transactions."**
- *"Why does MongoDB need a replica set for that?"* → Transactions depend on the replica set's oplog and session machinery; a standalone server doesn't support them.
- *"What if a transaction conflicts?"* → `withTransaction()` retries on transient errors like write conflicts.
- *"Why not use transactions everywhere?"* → They cost performance; single-document updates are already atomic, so I use transactions only when two documents must change together.
- *"Example where you chose not to?"* → Event registration — the state lives in one array on the User document, so one conditional update is enough.

**Drill 4 — "Your pagination."**
- *"Offset or cursor?"* → Both; cursor for comments/replies, offset for page-numbered lists.
- *"Why include `_id` in the sort?"* → `createdAt` can tie; without a unique tie-breaker the order between ties isn't guaranteed, so rows can repeat or vanish across pages.
- *"How do you know if there's a next page?"* → Fetch `limit + 1`; if I got the extra row, `hasMore` is true, and the cursor is from the last row **returned**.
- *"What index supports it?"* → `{ discussion: 1, createdAt: 1, _id: 1 }` — equality, then sort fields — and a test checks there's no in-memory sort.

**Drill 5 — "Socket.IO notifications."**
- *"How does the server know which socket is which user?"* → Handshake middleware verifies the cookie and the socket joins `user:<id>`.
- *"What if the user has three tabs?"* → Three sockets in the same room; all get it.
- *"What if they're offline?"* → It's in MongoDB; fetched next time.
- *"What if you run two servers?"* → Emits on server A wouldn't reach sockets on B — need the Redis adapter (Q115).
- *"How do you stop a logged-out user still receiving events?"* → logout-all disconnects the room; and sockets are disconnected when their token expires, and can't reconnect without a valid refresh.

**Drill 6 — "Role-based access control."**
- *"Where is it enforced?"* → On the backend in middleware; the frontend `ProtectedRoute` is only UX.
- *"Is a class rep a role?"* → No — it's a relationship on the Classroom. A role is global; being a class rep applies to one classroom only.
- *"How does an admin make someone a club admin?"* → Honestly, there's no API for that yet; it's set in the database. The edit-club form sends `adminIds`, but the backend ignores it. Adding a superadmin-only endpoint is on my list.
- *"How do you test permissions?"* → `authz.test.js`: students on superadmin routes, coordinators editing academics but not year, IDOR checks.

**Drill 7 — "Roster-based signup."**
- *"What stops someone typing a classmate's email?"* → The activation link goes to that email inbox; you must own it.
- *"Can the response tell an attacker who's on the roster?"* → No — same message and the email isn't awaited, so timing doesn't leak.
- *"What if two people click the same link at once?"* → The token is consumed with `findOneAndDelete` inside a transaction — only one request gets it; the test proves exactly one account is created.
- *"Why store only the hash of the token?"* → A database leak wouldn't give working links.

**Drill 8 — "Eligibility."**
- *"Where is it computed?"* → One service with a Mongo filter and an in-memory check that must match.
- *"Why both?"* → The filter is for listing many drives efficiently; the in-memory check gives the student **all the reasons** they fail one drive.
- *"What if CGPA is missing?"* → Can't evaluate → show nothing and ask for it; never guess 0 or 10.
- *"Can a student change their CGPA?"* → No — `updateProfile` returns 403; only coordinators/superadmin change it via the roster endpoint, in a transaction with the roster entry.

**Drill 9 — "Error handling."**
- *"What does the client see on an unexpected error?"* → "Internal server error" in production; the real message only in development.
- *"How do you find out what happened?"* → The response's `X-Request-Id` matches a log line with the stack.
- *"What about a bad ObjectId in the URL?"* → `CastError` → 400 "Invalid ID format", not 500.
- *"Duplicate email on insert?"* → Code 11000 → 409, and the logger scrubs the duplicated value from the message.

**Drill 10 — "Testing."**
- *"Unit or integration?"* → Mostly integration — real HTTP through the real app into a real (in-memory) MongoDB.
- *"Why not mock the DB?"* → My bugs were DB-behaviour bugs (Q186).
- *"How do you test rate limiting without interference?"* → Each test client sends its own `X-Forwarded-For` IP, trusted because `TRUST_PROXY=loopback` and Supertest connects from loopback.
- *"What about the frontend?"* → Not tested yet — I'd add React Testing Library and Playwright.

---
## 17. HR + Project Questions

### Must Know

**Q187. Why did you build this project?**

*(Make this personal and true.)* A natural version: "As a student, I kept missing things — a club event I'd have joined, a deadline that was only announced in one group, a placement drive I was eligible for but saw too late. Each piece of information existed, just scattered. I wanted one place that knows who I am — my class, my clubs, my eligibility — and shows what matters today. It was also a chance to build something realistic end to end: real authentication, permissions, caching and real-time features, not just CRUD."

**Q188. What was your role?**

"I built it on my own — requirements, data model, backend API, frontend, authentication and security, caching, notifications, and tests. Because it was solo, I also had to make the trade-off decisions myself, like keeping Redis optional or making the semester transition destructive, and I documented those decisions in code comments and the README." *(Adjust if anyone helped you.)*

**Q189. Explain the project to a non-technical person.**

"It's like a college app that knows you. When you open it, it tells you: here are your classes today, here's the club event you signed up for, here's an assignment due tomorrow, and here's a company hiring that you qualify for — apply before tonight. Teachers' representatives update the timetable, clubs post events, and the placement office runs the hiring rounds, all in the same app. And when something new happens, you get a notification instantly."

**Q190. What would you improve if you had more time?**

In priority order: (1) **deploy it** with CI/CD on AWS; (2) **schema validation** with Zod on every route; (3) a **shared Redis store** for rate limits and the **Socket.IO Redis adapter**, so it can run multiple instances; (4) move notification fan-out to a **job queue**; (5) fix the drive list so it **paginates in the database**; (6) **frontend tests** and E2E tests; (7) finish the competitive prep backend and add an API for assigning club admins.

**Q191. What did you learn?**

Technically: **concurrency** — that double clicks, retries and multiple tabs are normal, and writes must be atomic or idempotent; **security thinking** — authentication isn't authorization, and every write needs an ownership check; and how **optional dependencies** must fail fast. Process-wise: writing a **failing test first** for a bug, keeping **one source of truth** for business rules, and documenting trade-offs so future me understands why.

**Q192. What was your biggest mistake?**

*(Pick one that's true.)* A strong, honest one from the history: "Building features first and adding authorization later. Early on, any logged-in user could create an event for any club or post announcements to any club, because I only checked that the user was logged in. I found it in a review and fixed it with resource-level checks and allow-lists. Now I think about 'who is allowed to do this to this object' when I design the endpoint, not after." Another true option: duplicating the eligibility logic in five places.

### Important Follow-Ups

**Q193. How long did it take, and how did you plan it?**

The commit history runs from **June 2026 to October 2026**, in phases: core features first (June), then notifications, classrooms, placements and Redis (September), then a hardening phase — auth, security, race conditions, error handling, tests — and finally caching improvements, logging and a UI redesign (October). *(Describe your real schedule — e.g. alongside classes.)*

**Q194. How did you decide what to build first?**

The core student value first — dashboard, clubs, events, placements — because without those there's nothing to secure or optimize. Then I hardened what existed: auth, permissions, race conditions and tests. I'd say this taught me that security should come **earlier** next time (see Q192).

**Q195. How do you handle a feature you don't know how to build?**

Break it into small parts, read the official docs (Mongoose, Socket.IO, MDN), build a minimal version, and write a test for the tricky behaviour. For example, for cursor pagination I first wrote the test with tied timestamps to see the bug, then implemented the keyset query.

**Q196. How would you work on this in a team?**

Feature branches and **pull requests** — the repo already uses PRs for larger changes like the logging feature and the responsive redesign — code review, CI running tests on every PR, small focused commits, and documenting decisions in the README so others don't undo them by accident.

### Advanced

**Q197. Did you use AI tools while building it?**

Answer **honestly** — the commit history shows several commits co-authored with an AI coding assistant, and an interviewer might look. A confident answer: "Yes, I used an AI assistant, mainly for reviewing and hardening — finding edge cases, writing tests, and refactoring. I treated it like a reviewer: I decided what to build, checked every change, ran the tests, and I can explain every part of the code and why it's designed that way." Then **prove it** by explaining a piece of code in depth. Never claim you wrote every line alone if that's not true; understanding and ownership are what the interviewer is checking.

**Q198. Which part are you most proud of, and why?**

"The race-safety work. It's invisible to users when it works, but it's the difference between a demo and a real system. Every write — follows, registrations, votes, applications, account activation — behaves correctly under parallel requests, and I have tests that actually fire concurrent requests to prove it."

**Q199. If you rebuilt it from scratch, what would you do differently?**

Validation schemas (Zod) from day one; authorization designed with each endpoint; RESTful URLs everywhere (no `/create` and `/update` verbs); TypeScript for safer refactoring; React Query for server state; and a CI pipeline from the first week.

**Q200. Why should we believe you understand this code?**

"Ask me about any part. For example, I can explain why the follow endpoint checks `matchedCount` instead of `modifiedCount` — Mongoose timestamps add `updatedAt` to every update, so `modifiedCount` is 1 even when nothing really changed. Or why refresh tokens are hashed with SHA-256 but passwords with bcrypt." *(Pick two details you know cold.)*

---
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

