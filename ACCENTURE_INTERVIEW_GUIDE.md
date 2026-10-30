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
<!-- SECTION:partA -->
# Part A — Top 30 Most Likely Questions (Quick Revision)

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:partA -->

<!-- SECTION:partB -->
# Part B — Project Explanation Script

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:partB -->

<!-- SECTION:c1 -->
# Part C — Full Question Bank

_Not written yet. This section is filled in by a later commit._
<!-- /SECTION:c1 -->

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

