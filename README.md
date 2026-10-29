# Splitwise

Track shared expenses in a group, see who owes whom, and settle up in as few payments as possible.

**Tech stack**

- Backend: Java 17, Spring Boot 3.3, Spring Security, Spring Data JPA / Hibernate, Flyway, JJWT
- Database: PostgreSQL (developed against Neon)
- Frontend: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts
- Tests: JUnit 5, Mockito, AssertJ

## Features

**Auth**
- Sign up, log in, refresh, and log out (`/api/auth/**`)
- JWT access tokens (15 min) plus rotating refresh tokens (7 days), stored as SHA-256 hashes
- A daily job removes expired and revoked refresh tokens

**Groups**
- Create a group with a currency, list your groups, and view one group
- Add members by searching users by name or email
- Leave a group. The creator can't leave, and nobody can leave with a non-zero balance.
- Delete a group (creator only). This removes its expenses, settlements, recurring templates and notifications.

**Expenses**
- Split types: `EQUAL`, `EXACT`, and `PERCENTAGE`. Any rounding remainder goes to the first participant.
- Itemized entry: enter a receipt's line items and tick who had each one. The frontend turns this into an `EXACT` split, doing the math in integer cents.
- Receipts: attach one image per expense (JPEG, PNG, WebP or GIF, up to 5 MB, stored in Postgres). Any group member can view, replace or delete it.
- Categories: each expense has a category, with a per-category spending breakdown chart and month-over-month trend insights
- Recurring expenses: weekly or monthly templates. An hourly job creates the due expenses. Only the template's creator can deactivate it.
- Only the payer can edit or delete an expense

**Balances and settlements**
- Net balance per member, plus a history of recorded settlements
- Suggested settlements from greedy debt simplification, which needs at most n-1 payments for n members
- Record a payment (by the payer), or send a payment reminder (by the creditor)
- Settle-up digest: a daily job nudges people who owe money in groups with no activity for N days (default 3). Each person gets at most one nudge per quiet period.

**Real-time**
- Server-Sent Events at `GET /api/notifications/stream`, with a 20-second heartbeat. Several tabs or devices per user are supported.
- Events: expense added, added to group, settlement recorded, payment reminder, member left, recurring expense created, settle-up nudge
- The frontend reads the stream with `fetch` (so it can send the `Authorization` header) and reconnects on its own. A slow poll covers the case where streaming is blocked.

**Other**
- Multi-currency: each group has one currency (INR, USD, EUR, GBP, JPY, AUD, CAD, SGD). There is no FX conversion.
- CSV export of balances
- Dark mode, saved in `localStorage` and applied before the page renders
- Per-group activity feed
- Rate limiting on `/api/auth/**`, per client IP (`X-Forwarded-For` if present). Over the limit returns HTTP 429.

## Architecture

```
splitwise-app/
├── backend/                     Spring Boot API
│   └── src/main/java/com/splitwise/
│       ├── config/              SecurityConfig (filter chain, CORS, JSON 401/403)
│       ├── controller/          REST controllers (auth, groups, expenses, recurring, activity, notifications, users)
│       ├── dto/                 Request/response records, grouped per area (*Dtos.java)
│       ├── entity/              JPA entities and enums
│       ├── exception/           Typed exceptions + GlobalExceptionHandler
│       ├── repository/          Spring Data JPA repositories
│       ├── scheduler/           Recurring-expense (hourly) and settle-up digest (cron) jobs
│       ├── security/            JwtUtil, JwtAuthFilter, RateLimitFilter, user details
│       ├── service/             Business logic
│       └── util/                ValidationUtil (group membership check)
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/        Flyway migrations V1..V4
└── frontend/                    Next.js app
    └── src/
        ├── app/                 Routes: / (groups dashboard), /login, /signup, /groups/[groupId]
        ├── components/          Shared UI kit and forms (Card, Button, Field, NavBar, AddExpenseForm, ...)
        │   └── group/           Group page tabs: Expenses, Balances, Settle, Recurring (+ header, expense item, receipts)
        └── lib/                 API client and per-area modules (api, auth, expenses, groups, notifications, csv, ...)
```

The group page (`app/groups/[groupId]/page.tsx`) has five tabs: Expenses, Balances, Settle, Recurring and Activity. Each tab lives in its own component under `components/group/`, except Activity, which uses `components/ActivityFeed.tsx`.

**How auth works**
- Login and signup return a short-lived JWT access token and a refresh token. The server stores only a SHA-256 hash of each refresh token. `/api/auth/refresh` revokes the old token and issues a new pair (rotation). `/api/auth/logout` revokes the token.
- The API is stateless (`SessionCreationPolicy.STATELESS`). `JwtAuthFilter` reads `Authorization: Bearer <token>`, accepts only tokens of type `ACCESS`, and sets the security context. Everything except `/api/auth/**` requires authentication.
- Data access is scoped to group membership. Every group-scoped service method calls `ValidationUtil.requireMembership`, which throws `ForbiddenException` (HTTP 403) if the caller isn't a member.
- The frontend keeps tokens in `localStorage`. On a 401 it refreshes the tokens and retries the request once.

## Settlement algorithm

`ExpenseService.getGroupBalances` computes each member's net balance:

```
net = paid − owed − settlementsReceived + settlementsPaid
```

- `paid`: the sum of expense amounts the member paid
- `owed`: the sum of the member's shares across all expenses
- `settlementsPaid` / `settlementsReceived`: recorded settlements where the member was the payer or the recipient

A positive `net` means the group owes the member money (creditor). A negative `net` means the member owes money (debtor).

`ExpenseService.suggestSettlements` sorts members into two max-heaps: creditors by balance and debtors by the size of their debt. Balances under 0.01 are ignored. At each step it takes the largest creditor and the largest debtor and suggests a payment of the smaller of the two amounts. That payment clears at least one of them, and any leftover balance goes back on its heap. Every payment removes at least one person, so the group settles in at most n-1 payments. This is a greedy heuristic. It doesn't always find the fewest possible payments, but it is simple and predictable.

## Prerequisites

- JDK 17+
- Maven 3.9+
- Node.js 18+ and npm
- A PostgreSQL database (the Neon free tier works)

## Setup

```bash
git clone <repo-url> splitwise-app
cd splitwise-app

# Backend
cp backend/.env.example backend/.env    # then fill in DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET
cd backend
mvn spring-boot:run                      # http://localhost:8080 (API under /api)

# Frontend (in a second terminal)
cd frontend
cp .env.local.example .env.local         # optional; only needed if the API isn't on localhost:8080
npm install
npm run dev                              # http://localhost:3000
```

`backend/.env` is loaded by `spring-dotenv` when you run from `backend/`. You can also set the same variables in your shell. Flyway runs all pending migrations automatically when the app starts, so you don't need to set up a schema by hand.

## Environment variables

Backend (read by `backend/src/main/resources/application.yml`):

| Name | Required | Default | Description |
|---|---|---|---|
| `DB_URL` | Yes | none | JDBC URL, e.g. `jdbc:postgresql://<neon-pooler-host>/<db>?sslmode=require` |
| `DB_USERNAME` | Yes | none | Database user |
| `DB_PASSWORD` | Yes | none | Database password |
| `JWT_SECRET` | Yes | none | HMAC-SHA key for signing JWTs. Must be at least 32 bytes. |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated origins allowed to call the API |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | No | `10` | Requests per window per IP on `/api/auth/**` |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | No | `60` | Length of the rate-limit window in seconds |
| `SETTLE_UP_DIGEST_CRON` | No | `0 0 9 * * *` | Spring cron for the settle-up digest job (daily at 09:00) |
| `SETTLE_UP_DIGEST_STALE_AFTER_DAYS` | No | `3` | Days without group activity before debtors get a nudge |

Frontend:

| Name | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | No | `http://localhost:8080/api` | Base URL of the backend API, including `/api` |

Token lifetimes (15 min access, 7 days refresh) and the 5 MB upload limit are fixed in `application.yml`. They are not environment variables.

## Running tests

```bash
cd backend
mvn test
```

All backend tests are Mockito unit tests. They don't need a database or any environment variables. There are no frontend tests yet.

## API overview

All paths are under `/api`. Everything except `/api/auth/**` needs `Authorization: Bearer <accessToken>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup` | Create an account; returns tokens |
| POST | `/auth/login` | Log in; returns tokens |
| POST | `/auth/refresh` | Exchange a refresh token for a new token pair (rotation) |
| POST | `/auth/logout` | Revoke a refresh token |
| GET | `/users/search` | Search users to add to a group |
| POST | `/groups` | Create a group |
| GET | `/groups` | List the caller's groups |
| GET | `/groups/{groupId}` | Group detail with members |
| POST | `/groups/{groupId}/members` | Add a member |
| DELETE | `/groups/{groupId}/members/me` | Leave a group |
| DELETE | `/groups/{groupId}` | Delete a group (creator only) |
| POST | `/groups/{groupId}/expenses` | Create an expense |
| GET | `/groups/{groupId}/expenses` | List expenses |
| PUT | `/groups/{groupId}/expenses/{expenseId}` | Edit an expense (payer only) |
| DELETE | `/groups/{groupId}/expenses/{expenseId}` | Delete an expense (payer only) |
| POST | `/groups/{groupId}/expenses/{expenseId}/receipt` | Upload or replace a receipt (multipart) |
| GET | `/groups/{groupId}/expenses/{expenseId}/receipt` | Download a receipt image |
| DELETE | `/groups/{groupId}/expenses/{expenseId}/receipt` | Remove a receipt |
| GET | `/groups/{groupId}/balances` | Net balance per member |
| GET | `/groups/{groupId}/settlements/suggestions` | Simplified settle-up suggestions |
| POST | `/groups/{groupId}/settlements` | Record a payment from the caller |
| GET | `/groups/{groupId}/settlements` | Settlement history |
| POST | `/groups/{groupId}/settlements/remind` | Send a payment reminder |
| GET | `/groups/{groupId}/categories/breakdown` | Spend by category |
| GET | `/groups/{groupId}/spending-trend` | Monthly spend and category trends |
| GET | `/groups/{groupId}/activity` | Activity feed |
| POST | `/groups/{groupId}/recurring-expenses` | Create a recurring template |
| GET | `/groups/{groupId}/recurring-expenses` | List recurring templates |
| DELETE | `/groups/{groupId}/recurring-expenses/{templateId}` | Deactivate a template (creator only) |
| GET | `/notifications` | List the caller's notifications |
| GET | `/notifications/stream` | SSE stream of new notifications |
| GET | `/notifications/unread-count` | Unread notification count |
| PATCH | `/notifications/{notificationId}/read` | Mark one notification read |
| PATCH | `/notifications/read-all` | Mark all notifications read |

## Database migrations

- Flyway owns the schema. Migrations live in `backend/src/main/resources/db/migration/` and run on startup.
- Hibernate runs with `ddl-auto: validate`, so it checks the entities against the schema and never changes it. If an entity doesn't match the tables, the app fails to start.
- `baseline-on-migrate: true` with baseline version 1 lets an existing database (created before Flyway was added) adopt the migration history.
- Current migrations: `V1__baseline.sql`, `V2__add_group_currency.sql`, `V3__add_expense_receipts.sql`, `V4__drop_expense_share_settled.sql`.

To change the schema, add the next numbered file, e.g. `V5__add_expense_notes.sql`, with plain Postgres DDL. Update the matching entity in the same change, then restart the backend. Never edit a migration that has already been applied: Flyway checks each applied file against its stored checksum and refuses to start if one has changed.

## Project status and roadmap

The core flows are complete. See [ROADMAP.md](ROADMAP.md) for what's done, known gaps, and what's next.

## Screenshots

<!-- TODO: add docs/screenshots/login.png -->
<!-- TODO: add docs/screenshots/groups.png -->
<!-- TODO: add docs/screenshots/group-expenses.png -->
<!-- TODO: add docs/screenshots/group-balances.png -->
<!-- TODO: add docs/screenshots/settle-up.png -->
<!-- TODO: add docs/screenshots/dark-mode.png -->
