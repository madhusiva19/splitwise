# Splitwise-lite — Roadmap & Backlog

_Generated from a review of the current codebase (backend fully scaffolded, frontend auth-only)._

## Current State

### Backend (Spring Boot) — solid foundation
- **Auth**: signup, login, refresh, logout — JWT + refresh tokens, Spring Security
- **Groups**: create group, list my groups, get group detail, add member
- **Expenses**: create expense (EQUAL / EXACT / PERCENTAGE splits), list group expenses, get balances, settlement *suggestions* (debt-simplification)
- **Data model**: User, Group, GroupMember, Expense, ExpenseShare (per-person share + settled flag), Settlement, RefreshToken

### Frontend (Next.js) — auth shell only
- Login page, Signup page, generic `AuthCard` / `Field` components
- Home page just shows "Welcome, {name}" — no groups, expenses, or balances UI yet
- `apiFetch` helper wired up with JWT bearer token, tokens in `localStorage`

### Known gaps (backend)
- No endpoint to **record a settlement** (only `/settlements/suggestions` exists — nothing marks a debt as paid)
- No expense **edit/delete**
- No **notifications**
- No user search/invite-by-email for adding group members — check `addMember`'s current contract
- Tokens in `localStorage` — works, but worth knowing the XSS trade-off vs. httpOnly cookies

---

## Frontend Build Order

The frontend needs to be built almost from scratch past auth. Suggested sequence:

1. **Groups dashboard** — list of groups (card grid), "create group" modal, empty state
2. **Group detail page** — tabs/sections for Expenses / Balances / Members
3. **Add expense form** — description, amount, split-type selector, per-member share inputs that adapt to split type, paid-by selector
4. **Balances view** — "you owe X" / "X owes you" — good candidate for a simple visualization
5. **Settlement suggestions view** — show simplified "who pays whom", with a "mark as settled" action (needs the new backend endpoint below)
6. **Member management UI** — add member by email, member list with avatars/initials
7. **Global layout** — persistent nav/sidebar, user menu, replace the placeholder home page
8. **Loading / error / empty states** — none exist yet

**Design note**: the home page already uses a "paper/ink" mono aesthetic (`bg-paper`, `text-ink`, `font-mono`). Worth deciding if that's the intentional design language and carrying it consistently instead of defaulting to generic Tailwind styling.

---

## Feature Backlog

### High priority (fills real gaps)
- [ ] `POST /settlements` — actually record a settlement (currently only suggestions exist)
- [ ] Edit / delete expense (`PUT` / `DELETE /expenses/{id}`)
- [ ] Notification system — triggers: expense created, added to group, settlement recorded
- [ ] Search/invite user to group by email (verify + improve `addMember` contract)

### Medium priority
- [ ] Expense categories/tags (food, travel, rent) — enables filtering and breakdowns
- [ ] Group activity feed — chronological log of expenses/settlements/joins
- [ ] Multi-currency support (currency field per group)
- [ ] Recurring expenses (e.g. monthly rent split)

### Nice-to-have / stretch
- [ ] Expense receipts — image upload attached to an expense
- [ ] Export group summary (PDF/CSV of balances)
- [ ] Dark mode toggle

---

## Notification System — Design Notes

Fits naturally given the expense/settlement flow already modeled. Recommended approach: **Server-Sent Events (SSE)** over WebSockets — notifications are one-directional (server → client), so SSE gives the real-time behavior without bidirectional connection complexity. Spring supports this natively via `SseEmitter`.

**Scope for v1:**
1. `notifications` table: `id`, `user_id`, `message`, `type`, `read` (bool), `created_at`
2. REST endpoints: `GET /notifications`, `PATCH /notifications/{id}/read`
3. `GET /notifications/stream` — SSE endpoint, authenticated via JWT at handshake
4. Trigger creation on: expense added to a group, user added to a group, settlement recorded
5. Frontend: SSE client + bell icon with unread count + toast on new notification