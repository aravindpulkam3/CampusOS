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
<!-- SECTION:c2 -->
## 2. Architecture

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c2 -->

<!-- SECTION:c3 -->
## 3. Frontend (React)

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c3 -->

<!-- SECTION:c4 -->
## 4. Backend (Node.js + Express)

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c4 -->

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

