# Splitwise — Roadmap & Backlog

_Updated 2026-09-05 from a fresh review of the codebase. Supersedes the previous
version of this file, which described an auth-only frontend — that phase is done._

## Current State

### Backend (Spring Boot) — feature-complete for core flows
- **Auth**: signup, login, refresh, logout — JWT + refresh tokens, Spring Security
- **Groups**: create, list, get detail, add member, remove member (leave), delete group
- **Expenses**: create (EQUAL / EXACT / PERCENTAGE splits), list, **edit**, **delete**, category tagging
- **Balances & settlements**: balances view, debt-simplification suggestions, **record a settlement** (`POST /settlements`), settlement history, **payment reminders** (`POST /settlements/remind`)
- **Recurring expenses**: create/list/delete templates + a scheduler that generates expenses on cadence
- **Notifications**: CRUD + unread count, triggers on expense added / added to group / settlement / reminder / member left
- **Activity feed**: chronological log per group
- **User search**: `/users/search` for member invites
- **Category breakdown**: `/categories/breakdown` for spend-by-category
- **Data model**: User, Group, GroupMember, Expense, ExpenseShare, ExpenseCategory, Settlement, Notification, RecurringExpenseTemplate, RefreshToken

### Frontend (Next.js) — full app, not just auth shell
- Login / signup, groups dashboard (create + list), group detail page with 5 tabs: Expenses, Balances, Settle, Recurring, Activity
- Add/edit expense form, add member form, recurring expense form, category breakdown chart (recharts)
- Notification bell (polling-based) in `NavBar`, CSV export, dark mode toggle
- Shared UI kit: `Card`, `PageShell`, `EmptyState`, `ErrorBanner`, `ConfirmDialog`, `Skeleton`, `SegmentedControl`, `Money`
- "Paper/ink" mono design language applied consistently (`bg-paper`, `text-ink`, `font-mono`)

### Known gaps
- **No DB migrations** — `ddl-auto: update` in `application.yml`, no Flyway/Liquibase. Fine for solo dev, risky the moment schema changes hit a shared or prod database.
- **Near-zero test coverage** — one backend test (`RecurringExpenseServiceTest`), no tests for `ExpenseService` (the split-calculation and balance-netting logic — the highest-risk code in the app), no frontend tests at all.
- **Notifications are polled**, not pushed — `NavBar.tsx` uses `setInterval`; the original SSE design (`SseEmitter`, `GET /notifications/stream`) was scoped but never built.
- **Hardcoded currency** — `Money.tsx` always renders `₹`; no per-group currency field.
- **No receipt/image upload** on expenses.
- **CORS hardcoded to `localhost:3000`** — not yet env-driven for deploy.
- **Tokens in `localStorage`** — works, but still carries the XSS trade-off vs. httpOnly cookies (unresolved from the original design).
- **No rate limiting** on auth or API endpoints.
- `groups/[groupId]/page.tsx` is 838 lines doing all 5 tabs' state and handlers in one file — due for a split before more features land there.

---

## Build Order

One sequence, foundation first. Excludes receipt-OCR (a paid-tier feature in
Splitwise proper, out of scope here). Each item assumes the ones above it are done.

1. [ ] **Flyway (or Liquibase) migrations** — turn off `ddl-auto: update`. Do this before anything else touches the schema.
2. [ ] **Unit tests for `ExpenseService`** — EQUAL/EXACT/PERCENTAGE split math, remainder distribution, balance netting. Highest-risk untested code in the app.
3. [ ] **Split `groups/[groupId]/page.tsx`** into per-tab components — 838 lines of shared state/handlers; do this before more features land on that page.
4. [ ] **Env-driven CORS + rate limiting on `/auth/**`** — currently hardcoded to `localhost:3000`, no throttling on login/signup.
5. [ ] **Real-time notifications via SSE** (`GET /notifications/stream`) — replaces the `setInterval` poll in `NavBar.tsx`. All triggers already exist; this is wiring only, and unlocks live balance/expense updates across viewers for free.
6. [ ] **Settle-up digest nudges** — layer onto the existing reminder endpoint: "you owe ₹X, last activity 3 days ago."
7. [ ] **Multi-currency support** — currency field per group, stop hardcoding ₹ in `Money.tsx`.
8. [ ] **Itemized expense entry** — enter a receipt's line items manually, let each member tick what they had, auto-compute exact shares. Stands alone without OCR.
9. [ ] **Expense receipts** — image upload/attachment on an expense (storage + display only, no parsing).
10. [ ] **Spending trend insights** — "you spent 40% more on food this month," extending the category breakdown chart already in place.
11. [ ] **Export group summary as PDF** (CSV export already exists).
12. [ ] **Re-evaluate token storage** — httpOnly cookies vs. `localStorage`, once this goes beyond solo/local use.
13. [ ] **Live FX conversion** — builds on #7: convert balances across a group's mixed-currency expenses for trips abroad.

---

## Notification System — Design Notes (still applies, not yet built)

REST CRUD is done; only the push layer is missing. Recommended approach: **Server-Sent Events (SSE)** over WebSockets — notifications are one-directional (server → client), so SSE gives real-time behavior without bidirectional connection complexity. Spring supports this natively via `SseEmitter`.

**Remaining scope:**
1. `GET /notifications/stream` — SSE endpoint, authenticated via JWT at handshake
2. Frontend: SSE client replacing the `setInterval` poll in `NavBar.tsx`; keep the bell/unread-count UI as-is
