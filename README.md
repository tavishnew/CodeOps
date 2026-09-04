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

### Seeding and the demo account

Real sign-ups start **empty** — no mock data. Their dashboard fills when they
connect their own GitHub account (Settings → Connect GitHub) or add records
manually. The seeded walkthrough data (Axiom, AutoQA, Notely, SignalDock,
insights, …) belongs to exactly one account: the **Demo** account, provisioned
at boot when `DEMO_EMAIL` + `DEMO_PASSWORD` are set. It shows a DEMO badge in
the UI, and its GitHub connect button honestly explains that demo accounts
can't connect a real account.

To backfill a specific user's workspace manually:

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
Auth works with zero CORS or SameSite configuration. The server ships **no CORS
middleware by default** — it only activates when `CLIENT_ORIGIN` is set (split
mode).

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

## Split deployment: SPA on Vercel, API on Render

Fully supported (the previous guidance treated it as a hypothetical — it is now
wired end to end), though it costs more than the single-service option: it needs
credentialed CORS, cross-site cookies, and HTTPS on both hosts. Two modes exist;
pick one and set the env vars consistently.

**Mode A — direct API calls (recommended).** The SPA talks straight to the
Render origin, cross-origin, with cookies. Set `VITE_API_URL` to the Render URL
in the Vercel project's build environment (it is baked into the bundle at build
time). On Render set `CLIENT_ORIGIN` to the Vercel origin. The server then:
answers credentialed CORS for that origin, trusts it in Better Auth, and issues
`SameSite=None; Secure` session cookies (all cookie behavior lives in Better
Auth — `server/_core/betterAuth.ts`; there is no legacy custom cookie layer).
The `vercel.json` rewrites are inert in this mode because the SPA never calls a
relative `/api` path.

**Mode B — same-origin rewrite.** Leave `VITE_API_URL` unset and let
`vercel.json` proxy `/api/:path*` (plus SPA fallback to `/index.html`) to the
Render URL. From the browser's perspective everything is one origin, so no CORS
is exercised; cookies still need to survive the proxy, so also set
`CLIENT_ORIGIN` on Render. Replace the placeholder in `vercel.json` with your
Render URL.

**Vercel project settings** (both modes): the repo builds from its root
(`package.json`, `vite.config.ts`, output `dist/public/` are all at the repo
root), so set **Root Directory to `.`**, Framework Preset **Vite**, build
command **`pnpm build`**, and Output Directory **`dist/public`**. Set
`VITE_API_URL` (Mode A) in the Vercel environment.

**Render settings** (both modes): set `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL` to the Render service URL, and `CLIENT_ORIGIN` to the Vercel
origin. **GitHub OAuth:** the Authorization callback URL registered in the
GitHub OAuth App must be the *Render* URL
(`https://<api>.onrender.com/api/github/callback`) — the token exchange runs
server-side there. The app's Homepage URL can be the Vercel URL. After connect,
the callback redirects the browser back to `CLIENT_ORIGIN`, and the "Connect
GitHub" button always targets the server origin (`githubStatus.connectUrl`),
so the flow works identically in both modes.

Re-test sign-up, sign-in, logout, and the GitHub connect round-trip across
origins before shipping. Note: Google social sign-in, if ever enabled, redirects
its OAuth callback to `BETTER_AUTH_URL` (the Render origin), so it would land on
Render's own SPA copy rather than Vercel — email/password auth is the
cross-origin-tested path.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | MySQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | Signing secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | — | Public URL; set in production |
| `BETTER_AUTH_TRUSTED_ORIGINS` | — | Extra auth origins (split deployments; `CLIENT_ORIGIN` is trusted automatically) |
| `CLIENT_ORIGIN` | — | SPA origin(s) — enables credentialed CORS, `SameSite=None` cookies, and client-origin redirects |
| `VITE_API_URL` | — | **Client build env (Vercel)**: absolute API origin for direct cross-origin calls; unset = relative `/api` via the `vercel.json` rewrite |
| `GITHUB_CLIENT_ID` / `_SECRET` / `_CALLBACK_URL` | — | Per-user GitHub OAuth App connect (see below) |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | — | AES key for encrypted GitHub token storage (defaults to a hash of `BETTER_AUTH_SECRET`) |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | — | Provision the labeled Demo account with seeded walkthrough data |
| `GOOGLE_CLIENT_ID` / `_SECRET` | — | Google social sign-in |
| `PORT` | — | Server port (Render injects its own) |
| `NODE_ENV` | — | `development` / `production` |

No AI-provider keys exist yet — the AI surfaces are static UI copy. When a
provider is added, keys would join this list.

### GitHub repository connection

Each real account can connect its own GitHub account from **Settings → Connect
GitHub** (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`; in a
split deployment the callback URL points at the Render server and redirects land
back on `CLIENT_ORIGIN`).
The flow is a standard OAuth2 authorize redirect with a signed state nonce
(`/api/github/connect` → GitHub → `/api/github/callback`), requesting `repo` and
`read:user` scopes (repo covers public + private repos; drop to `public_repo`
only if you never show private data). The access token is encrypted at rest
(AES-256-GCM) in `github_connections`, tied to the user row — never plaintext.
After connect, the server pulls repos + open issues/PRs and stores them as
workspace rows (`source = 'github'`), so the dashboard reads its normal tables
instead of hammering the GitHub API on every page load. "Sync now" re-pulls;
"Disconnect GitHub" deletes the token and the GitHub-sourced rows.

GitHub OAuth Apps accept a single callback URL, so this app cannot double as a
GitHub **social sign-in** provider — the same credentials are intentionally not
registered in Better Auth (email/password and Google sign-in remain available).

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
