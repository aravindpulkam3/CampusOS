---
name: explain-code
description: Deeply explains how features and flows work in this repository. Use whenever the user asks how something works, asks for a request flow, architecture explanation, function explanation, or wants to understand code for interview preparation.
---

When explaining anything from this repository, inspect the actual implementation first.

The explanation must connect every important step in the flow to the exact file and function responsible for it.

Do not give a generic architecture explanation unless it is clearly tied back to the repository code.

## Required explanation structure

### 1. Big picture

Start with a simple explanation of what the feature does and why it exists.

Keep this intuitive before going into implementation details.

### 2. Complete execution flow

Trace the real execution path through the repository.

For every step, explicitly show:

Step N — <what is happening>

File:
`path/to/file.ts`

Function:
`functionName()`

What this function is doing:
- explain the responsibility
- explain the important input
- explain what it returns or calls next
- explain how data changes at this step

Then show the next step in the flow.

For example:

Client sends login request
        ↓
`routes/authRoutes.js`
`router.post("/login", login)`
        ↓
`controllers/authController.js`
`login()`
- validates email/password
- calls the user service
        ↓
`services/userService.js`
`findUserByEmail()`
- queries PostgreSQL
        ↓
`auth/token.js`
`generateAccessToken()`
- creates the JWT

The user should always be able to see both:
1. WHAT is happening
2. WHERE in the code it is happening

### 3. Trace one concrete example

When useful, take a realistic example and follow it through the entire flow.

Example:

POST /api/auth/login

body:
{
  "email": "user@example.com",
  "password": "..."
}

Then explain what happens to this data at each function.

Show important values as they move through the system.

### 4. Explain clever, non-obvious, or complex code

Whenever the implementation contains something that is:

- clever
- subtle
- performance-related
- security-related
- concurrency-related
- easy to misunderstand
- intentionally designed around an edge case
- more complex than a straightforward implementation

STOP and explain it separately.

Use:

#### Important detail — Why this code exists

Explain:
- what problem it solves
- why the obvious/simple approach may fail
- what the current implementation is doing
- what could go wrong if this logic were removed
- whether this is a common industry pattern

Examples include:
- double-checking cache state
- deduplicating queue jobs
- using transactions
- optimistic locking
- refresh-token rotation
- JWT `jti`
- Redis TTLs
- request retries
- stale-job checks
- fallback retrieval
- `Promise.all`
- batching
- pagination cursors
- rate limiting
- database indexes
- defensive validation
- race-condition prevention

Do not skip these details just because the code works.

### 5. Explain important code snippets

For important or confusing lines, quote only the minimum necessary code and explain it.

Explain:
- syntax
- what the line actually does
- why it is needed
- what value it produces

Do not explain obvious boilerplate line by line.

### 6. Function relationships

At the end, provide a compact function-call map.

Example:

`router.post()`
   ↓
`loginController()`
   ↓
`findUserByEmail()`
   ↓
`comparePassword()`
   ↓
`generateAccessToken()`
   ↓
`generateRefreshToken()`

Also mention asynchronous boundaries, database calls, external APIs, queues, caches, or workers.

### 7. Data flow

If data is transformed, show that transformation.

Example:

HTTP request body
   ↓
validated credentials
   ↓
User DB row
   ↓
user.id
   ↓
JWT payload
   ↓
signed access token
   ↓
HTTP response

For objects, mention important fields when useful.

### 8. Interview connection

Whenever the implementation demonstrates an important SDE concept, explain it.

Examples:

- authentication vs authorization
- JWT
- sessions
- transactions
- indexing
- caching
- queues
- workers
- concurrency
- race conditions
- REST
- middleware
- database normalization
- connection pooling
- idempotency
- retries
- eventual consistency

For each concept, briefly explain:

**Interview connection**

What the concept is.

How this repository is using it.

One or two questions an interviewer could ask about this implementation.

### 9. Design reasoning

Explain important architecture decisions.

For example:

Why Redis is used here instead of PostgreSQL.

Why this operation happens in a worker instead of inside the HTTP request.

Why this function is separated into a service.

Why the code uses a transaction.

Why a particular fallback exists.

Also point out:

- unnecessary complexity
- duplicated logic
- fragile assumptions
- possible simplifications
- scalability limitations

Do not automatically defend the existing architecture.

### 10. Final mental model

End with a short summary of the flow in plain English.

The user should be able to explain the feature in an interview after reading the answer.

## Important behavior

Always inspect all relevant files before explaining.

Follow imports and function calls when necessary.

If a function delegates important logic to another function, trace into that function instead of stopping early.

Do not guess how a function works when its implementation can be inspected.

Prefer actual repository names, paths, functions, database tables, queues, caches, and APIs over generic terms.

Do not modify any code unless explicitly requested.