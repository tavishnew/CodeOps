# CodeOps

Engineering-operations workspace: projects, issues, pull requests, deployments,
incidents, automations, knowledge, and AI-signal insights in one database-backed
dashboard. Single Express server (tRPC API + Better Auth + built SPA) with a
React 19 / Vite / Tailwind 4 client and a MySQL 8 database via Drizzle.

## Stack

- **Client** — React 19 + Vite + wouter + Tailwind 4 (`client/`)
- **Server** — Express + tRPC + Drizzle + Better Auth (`server/`)
- **Shared** — cross-package types (`shared/`)
- **Database** — MySQL 8 (`drizzle/` schema + SQL migrations)

## Local setup

Prerequisites: Node 20+, pnpm 10+, Docker (for MySQL).

```bash
pnpm install
cp .env.example .env          # fill in DATABASE_URL + BETTER_AUTH_SECRET
docker run -d --name codeops-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=codeops \
  -e MYSQL_USER=local -e MYSQL_PASSWORD=local -p 127.0.0.1:3306:3306 mysql:8.0
pnpm db:migrate               # applies drizzle/*.sql in order (idempotent)
pnpm dev                      # http://localhost:3000
```

Generate a secret with `openssl rand -base64 32`.

### Seeding

New workspaces seed themselves automatically (projects, issues, PRs,
deployments, incidents, automations, knowledge, insights) on first sign-in. To
backfill an existing user's workspace:

```bash
pnpm db:seed -- <userId>      # userId = the app `users` table row id
```

### Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Dev server (Vite HMR + API on :3000) |
| `pnpm build` | Build client → `dist/public/`, bundle server → `dist/index.js` |
| `pnpm start` | Run the production server (`node dist/index.js`) |
| `pnpm check` | `tsc --noEmit` |
| `pnpm test` | Vitest suite |
| `pnpm test:e2e` | Playwright suite |
| `pnpm db:migrate` | Apply `drizzle/*.sql` in order (idempotent, safe to re-run) |
| `pnpm db:seed -- <id>` | Create + seed a user's workspace |

## Deploying — recommended: single Render service

This app is designed to run as **one Render web service** that serves the API,
auth, and the built SPA from the same origin. Same-origin cookies mean Better
Auth works with zero CORS or SameSite configuration. There is deliberately **no
CORS middleware** in the server.

1. **Database** — Render has no managed MySQL. Provision one at PlanetScale,
   TiDB Cloud, Aiven, Railway, or run MySQL 8 on a VPS, then set `DATABASE_URL`
   (`mysql://user:password@host:3306/codeops`).
2. **Deploy** — push this repo to GitHub, then on Render: *New → Blueprint* and
   point at the repo (uses `render.yaml`), or *New → Web Service* and use:
   - Build: `pnpm build`
   - Start: `pnpm start`
   - Pre-deploy: `pnpm db:migrate`
   - Plan: free tier is fine to start
3. **Environment** — set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and
   `BETTER_AUTH_URL` (the service's URL, e.g. `https://codeops.onrender.com`).
   `db:migrate` runs automatically before each deploy, so schema changes land
   before new code.
4. **First deploy** — the free web service sleeps when idle; the first request
   after wake takes a few seconds. `pnpm db:migrate` handles fresh databases and
   re-runs alike.

`render.yaml` is included in the repo for the blueprint flow.

## Alternative: split SPA (Vercel) from API (Render)

Possible but **not recommended** for this app — it buys edge caching for a
couple of hundred KB of static assets while costing real auth complexity:

- Serve the static `dist/public/` on Vercel, with `vercel.json` rewrites
  proxying `/api/*` to the Render URL.
- The server would need **CORS middleware** added for `/api/*` (it has none
  today).
- Better Auth cookies must survive the origin split: set `BETTER_AUTH_URL` to
  the Vercel origin, add the Vercel origin to `BETTER_AUTH_TRUSTED_ORIGINS`, and
  switch cookies to cross-site mode (`SameSite=None; Secure`), which also
  requires HTTPS on both hosts and typically a custom domain.
- There is no legacy custom cookie layer left in the repo to adjust — all auth
  cookie behavior lives in Better Auth via `server/_core/betterAuth.ts`
  (env-driven).

If you do split, wire the env vars already present in `.env.example`
(`BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`) and re-test sign-up and
sign-in across origins before shipping.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | MySQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | Signing secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | — | Public URL; set in production |
| `BETTER_AUTH_TRUSTED_ORIGINS` | — | Extra auth origins (split deployments) |
| `GITHUB_CLIENT_ID` / `_SECRET` | — | GitHub social sign-in |
| `GOOGLE_CLIENT_ID` / `_SECRET` | — | Google social sign-in |
| `PORT` | — | Server port (Render injects its own) |
| `NODE_ENV` | — | `development` / `production` |

No AI-provider keys exist yet — the AI surfaces are static UI copy. When a
provider is added, keys would join this list.

## Testing

```bash
pnpm check    # typecheck
pnpm test     # unit/integration (vitest, 23 tests)
pnpm test:e2e # Playwright against a running server
```

## Layout

```
client/       React SPA (pages, components, ui primitives)
server/       Express + tRPC routers + Better Auth + db layer + seeds
drizzle/      MySQL schema (schema.ts) + ordered SQL migrations
shared/       Shared types (DashboardSection, StatusTone)
scripts/      db-migrate runner
e2e/          Playwright specs
```
