# Splitwise — Roadmap & Backlog

_Updated 2026-10-29 from a review of the code in the working tree, including uncommitted
work on `dev`. Supersedes the 2026-09-05 version, which listed most of the build order as not started._

## Current State

### Backend (Spring Boot)
- **Auth**: signup, login, refresh, logout. JWT access tokens (15 min), plus refresh tokens (7 days) that are SHA-256 hashed at rest and rotated on every refresh. A daily job cleans up expired and revoked tokens.
- **Security**: stateless `JwtAuthFilter`, membership-scoped 403s via `ValidationUtil.requireMembership`, JSON 401/403 bodies, CORS from `CORS_ALLOWED_ORIGINS`, and a per-IP fixed-window rate limit on `/api/auth/**` (HTTP 429)
- **Groups**: create (with a currency), list, detail, add member, leave (blocked for the creator and for anyone with a non-zero balance), delete (creator only, explicit child-row cleanup)
- **Expenses**: EQUAL, EXACT and PERCENTAGE splits; edit and delete (payer only); categories; per-category breakdown; month-over-month spending trend
- **Receipts**: one image per expense (JPEG/PNG/WebP/GIF, max 5 MB) stored as `BYTEA`. Any member can upload, replace, view or delete it.
- **Balances & settlements**: net balances, greedy debt-simplification suggestions (at most n-1 payments), record a settlement, history, payment reminders
- **Recurring expenses**: weekly or monthly templates; an hourly scheduler creates the due expenses and advances `nextRunAt`
- **Settle-up digest**: a daily cron (`SETTLE_UP_DIGEST_CRON`) nudges debtors in groups idle for `SETTLE_UP_DIGEST_STALE_AFTER_DAYS`, at most once per idle period
- **Notifications**: REST list, unread count and mark-read, plus SSE push (`GET /notifications/stream`)
- **Activity feed** per group, and user search for invites
- **Schema**: Flyway migrations V1–V4, Hibernate `ddl-auto: validate`
- **Tests**: 45 Mockito unit tests, none needing a database: `ExpenseService` (20), `ExpenseReceiptService` (11), `RecurringExpenseService` (6), `SettleUpDigestService` (4), `RateLimitFilter` (4)

### Frontend (Next.js)
- Login and signup, a groups dashboard, and a group page with five tabs: Expenses, Balances, Settle, Recurring, Activity
- The group page is split up: `page.tsx` (233 lines) holds the data loading; each tab is its own component under `components/group/`
- Add/edit expense form with itemized line-item entry (integer-cent math → EXACT split), a receipt section, recurring expense form, and category breakdown chart
- Spending trend insights (`SpendingTrendInsights.tsx`), shown on the Expenses tab (`ExpensesTab.tsx`)
- Notification bell fed by SSE, with a slow fallback poll; per-group currency symbol in `Money.tsx`; CSV export of balances; dark mode
- Shared UI kit: `Card`, `Button`, `Field`, `Avatar`, `PageShell`, `EmptyState`, `ErrorBanner`, `ConfirmDialog`, `Skeleton`, `SegmentedControl`, `Money`

### Known gaps
- **Tokens in `localStorage`**: access and refresh tokens are still readable by any script running on the page, so an XSS bug would expose them. They have not moved to httpOnly cookies.
- **No frontend tests**: no test runner is configured. `lib/itemizedSplit.ts` and the API client's refresh-and-retry logic are the best first candidates.
- **No PDF export**: only CSV, and only for balances.
- **No FX conversion**: one currency per group; there is no mixed-currency group.
- **The rate limiter trusts `X-Forwarded-For` blindly**: a client can send a different header value on each request and never hit the limit. Use the header only from a known proxy.
- **Single-instance assumptions**: rate-limit windows and SSE emitters live in memory, so running more than one backend instance would split them.
- **A failed recurring template aborts the whole run**: an exception from `createExpense` isn't caught per template. It stops the loop and rolls back the expenses already created in that run, since `processDueTemplates` is one transaction. Only notification failures are isolated.
- **Monthly recurrence drifts after a short month**: a template on the 31st moves to Feb 28 and then stays on the 28th, because each run adds one month to the previous run date, not to the original day.
- **`show-sql: true`** is on in `application.yml`, which is noisy in any shared environment.
- **The `globals.css` type error is editor-only**: `npx tsc --noEmit` passes. `src/types/css.d.ts` (`declare module '*.css';`) was added so the editor's TypeScript stops flagging `import "./globals.css"`.

---

## Build Order

1. [x] **Flyway migrations**: V1 baseline through V4; `ddl-auto: validate`
2. [x] **Unit tests for `ExpenseService`**: 20 tests covering split math, remainders, balance netting and settlement suggestions
3. [x] **Split `groups/[groupId]/page.tsx`** into per-tab components under `components/group/`
4. [x] **Env-driven CORS + rate limiting on `/auth/**`** (partial: the limiter's IP detection can be spoofed, see Known gaps)
5. [x] **Real-time notifications via SSE**, replacing the `setInterval` poll
6. [x] **Settle-up digest nudges**
7. [x] **Multi-currency support**: per-group currency; `Money.tsx` uses it
8. [x] **Itemized expense entry**
9. [x] **Expense receipts**: upload, view, replace, delete
10. [x] **Spending trend insights**: `/spending-trend` endpoint and `SpendingTrendInsights` on the Expenses tab. Not yet committed: the component is still an untracked file.
11. [ ] **Export group summary as PDF**: not started (CSV of balances exists)
12. [ ] **Re-evaluate token storage**: not started, still `localStorage`
13. [ ] **Live FX conversion**: not started, depends on mixed-currency groups

---

## Notifications — how it works

`NotificationService.notify` saves a `Notification` row and pushes it to every open `SseEmitter` for that user (one per tab or device, held in memory, 30-minute timeout, 20-second heartbeat).
The frontend (`lib/notifications.ts`) reads `/notifications/stream` with `fetch`, because native `EventSource` can't send an `Authorization` header. It reconnects on its own, and `NavBar` keeps a slow poll as a fallback.

---

## Next up

1. **Commit the outstanding `dev` work** (V4 migration, new components, refactors) and merge to `main`
2. **Harden rate-limit IP detection**: use `X-Forwarded-For` only behind a configured trusted proxy
3. **Isolate recurring-template failures**: give each template its own transaction or try/catch, and fix the monthly drift by anchoring to the original day of the month
4. **Frontend tests**: add Vitest, starting with `itemizedSplit.ts` and the `api.ts` refresh-and-retry logic
5. **Move tokens to httpOnly cookies** before any public deployment
6. **PDF export** of a group summary
