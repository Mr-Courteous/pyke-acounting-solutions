# MBS-Bridge frontend

React (plain JS, Vite) frontend for the accounting engine in
`../accounting_engine`. Replaces the vanilla-JS dashboard in
`accounting_engine/public/`.

## Running it

```
npm install
npm run dev
```

The dev server proxies `/api/*` to `http://localhost:4000` (see
`vite.config.js`) — start `accounting_engine`'s `server.js` alongside
this. Set `VITE_API_PROXY_TARGET` if the backend runs somewhere else.

First run: no users exist yet, so the login screen's "Setting this up
for the first time?" link creates the first ADMIN account
(`POST /api/auth/bootstrap-admin`). Every user after that is created
by an admin from within the app (once a Users/Settings page exists —
not built yet, see "What's not here" below).

## Where things are, and what to edit for what

- **Brand colors/fonts** — `src/theme.js`. One file, plain JS object.
  Edit a hex here and every page picks it up (it's pushed onto CSS
  custom properties at startup in `main.jsx`). Don't hardcode colors
  anywhere else — use `var(--ledger-green)` etc. in CSS, or import
  `theme` directly in JS if a raw value is genuinely needed (a chart
  library, an inline style).
- **API calls** — `src/api/client.js`. One function per backend
  endpoint, grouped by module (`auth`, `bi`, `ar`, `ap`, `contacts`,
  `projects`, `gl`, `bank`, `invoices`). If a backend route changes,
  this is the one file to update — every hook and page calls through
  here, nothing else touches `fetch` directly.
- **Data fetching per page** — `src/hooks/`. One small file per
  resource (`useReceivables.js`, `useProjects.js`, ...), each a thin
  wrapper around `useApiRequest.js` (the shared loading/error/data
  logic). Add a param, change a query, or add a new resource here
  without touching the pages that use it.
- **Auth/session** — `src/contexts/AuthContext.jsx`. Holds the current
  user, exposes `login()`/`logout()`, verifies a stored token on load.
- **Shell/layout** — `src/components/Layout.jsx`,
  `Sidebar.jsx`, `Topbar.jsx`. Add a page to the nav by adding one line
  to `NAV_ITEMS` in `Sidebar.jsx` and one `<Route>` in `App.jsx`.
- **Reusable UI pieces** — `src/components/`: `DataTable.jsx` (columns
  + rows, no per-page `<table>` markup), `StatCard.jsx`,
  `StatusChip.jsx` (color follows status automatically — see
  `STATUS_TONE` at the top of the file), `ProtectedRoute.jsx`.
- **Pages** — `src/pages/`, one file per screen, matching the backend
  module they read from.
- **Formatting helpers** — `src/utils/format.js` (`formatMoney`,
  `formatDate`).

## Design system

Grounded in what this product actually is — a ledger, not a generic
SaaS dashboard: sage-paper background, ink text, a ledger-green
primary accent, brass for pending/secondary status, signal-red for
errors/overdue. Newsreader (serif) for titles, IBM Plex Sans for UI
text, IBM Plex Mono for anything that's actually a code or amount
(TINs, IRNs, currency figures). See `src/theme.js` and
`src/styles/tokens.css` for the full token list, `src/styles/components.css`
for how they're used.

## What's not here yet

- User management screen (`/api/auth/users` exists on the backend,
  no page calls it yet — an admin has to hit the API directly for now)
- Recording an AR payment / creating an AP bill / creating a
  project+phase+cost entry from the UI — the read side of every module
  is wired up; the write side (forms) isn't built for anything past
  login/bootstrap
- Bank statement-line matching (match/unmatch/ignore actions)
- Phase 2 (Inventory/Order Entry/Purchase Orders) has no backend yet,
  so obviously nothing here either
