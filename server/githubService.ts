import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "./_core/encryption";
import { ENV } from "./_core/env";
import { getBetterAuth } from "./_core/betterAuth";
import { fromNodeHeaders } from "better-auth/node";
import { getDb, getUserByOpenId, upsertUser } from "./db";
import { githubConnections, projects, issues, pullRequests, workspaces } from "../drizzle/schema";
import { getOrCreateWorkspace } from "./seed";

/**
 * OAuth App scopes: `repo` covers public+private repo contents and lets the
 * dashboard read repos/issues/PRs. `read:user` gives the profile. If you only
 * ever show public repositories you can narrow to `public_repo`, but the
 * product model assumes connected users see their own private repos too.
 */
export const GITHUB_SCOPES = ["repo", "read:user"].join(" ");
export const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_STATE_COOKIE = "gh_oauth_state";

export function isGithubConfigured(): boolean {
  return Boolean(ENV.github.clientId && ENV.github.clientSecret && ENV.github.callbackUrl);
}

/**
 * Absolute URL that starts the OAuth flow. Always the server's own origin
 * (BETTER_AUTH_URL — the Render URL in a split deployment), because the GitHub
 * OAuth App callback is registered against that origin and the state-nonce
 * cookie must round-trip on it. The SPA opens this URL regardless of where it
 * is hosted, so the flow works in single-service, Vercel-rewrite, and
 * direct-cross-origin modes alike.
 */
export function githubConnectUrl(): string {
  return `${ENV.auth.url.replace(/\/+$/, "")}/api/github/connect`;
}

/**
 * Post-OAuth redirect target for the browser. In split mode the user must land
 * back on the SPA origin (CLIENT_ORIGIN); in single-service mode a relative
 * path is correct (API and SPA share an origin).
 */
function appPath(path: string): string {
  const clientOrigin = ENV.clientOrigins[0]?.replace(/\/+$/, "");
  return clientOrigin ? `${clientOrigin}${path}` : path;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: ENV.github.clientId,
    redirect_uri: ENV.github.callbackUrl,
    scope: GITHUB_SCOPES,
    state,
    response_type: "code",
  });
  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

async function githubToken(code: string): Promise<{ accessToken: string; scopes: string[] }> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      client_id: ENV.github.clientId,
      client_secret: ENV.github.clientSecret,
      code,
      redirect_uri: ENV.github.callbackUrl,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
    scope?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(`GitHub token exchange failed: ${payload.error_description || payload.error || response.status}`);
  }
  return { accessToken: payload.access_token, scopes: (payload.scope ?? "").split(",").map(s => s.trim()).filter(Boolean) };
}

async function githubApi<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${GITHUB_API_URL}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "codeops-app",
    },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("GitHub rejected the stored token — reconnect your account.");
    if (response.status === 404) throw new Error(`GitHub resource not found: ${path}`);
    throw new Error(`GitHub API ${response.status} on ${path}`);
  }
  return (await response.json()) as T;
}

type GitHubUser = { id: number; login: string; name: string | null; email: string | null };
export type GitHubRepo = {
  id: number;
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  pushed_at: string | null;
};
export type GitHubIssueOrPr = {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  pull_request?: { url: string };
  created_at: string;
};

/** Pure mapping helpers (unit-tested). Issues/PRs carry no URL column — their
 *  project row (from the same repo) is the link back to GitHub. */
export function mapRepoToProject(repo: GitHubRepo) {
  return { name: repo.name, repositoryUrl: repo.html_url, description: repo.description };
}
export function mapIssueToRow(repo: GitHubRepo, issue: GitHubIssueOrPr) {
  return { key: `GH-${issue.number}`, title: issue.title };
}
export function mapPrToRow(repo: GitHubRepo, pr: GitHubIssueOrPr) {
  return { number: pr.number, title: pr.title, status: pr.state };
}

type NewIssue = InferInsertModel<typeof issues>;
type NewPullRequest = InferInsertModel<typeof pullRequests>;

/**
 * Reconcile a GitHub snapshot into the workspace tables. Only rows previously
 * written with source='github' are replaced, so manual/seed records survive.
 * The stored tables are the cache: dashboard reads never hit the GitHub API.
 */
export async function storeGithubSnapshot(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  workspaceId: number,
  snapshot: { repos: GitHubRepo[]; byRepo: Map<string, GitHubIssueOrPr[]> },
) {
  await db.delete(pullRequests).where(and(eq(pullRequests.workspaceId, workspaceId), eq(pullRequests.source, "github")));
  await db.delete(issues).where(and(eq(issues.workspaceId, workspaceId), eq(issues.source, "github")));
  await db.delete(projects).where(and(eq(projects.workspaceId, workspaceId), eq(projects.source, "github")));

  const projectIdsByRepo = new Map<string, number>();
  for (const repo of snapshot.repos) {
    const mapped = mapRepoToProject(repo);
    await db.insert(projects).values({ workspaceId, ...mapped, source: "github", status: "on_track" });
    const [created] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.repositoryUrl, repo.html_url), eq(projects.source, "github")))
      .limit(1);
    if (created) projectIdsByRepo.set(repo.full_name, created.id);
  }

  const issueValues: NewIssue[] = [];
  const prValues: NewPullRequest[] = [];
  for (const [fullName, records] of Array.from(snapshot.byRepo.entries())) {
    const projectId = projectIdsByRepo.get(fullName);
    const repo = snapshot.repos.find(r => r.full_name === fullName);
    if (!projectId || !repo) continue;
    for (const record of records) {
      if (record.pull_request) {
        const mapped = mapPrToRow(repo, record);
        prValues.push({ workspaceId, projectId, ...mapped, source: "github", risk: "medium" });
      } else {
        const mapped = mapIssueToRow(repo, record);
        issueValues.push({ workspaceId, projectId, ...mapped, source: "github", status: "open", priority: "medium" });
      }
    }
  }
  if (issueValues.length) await db.insert(issues).values(issueValues);
  if (prValues.length) await db.insert(pullRequests).values(prValues);
  return { projects: snapshot.repos.length, issues: issueValues.length, pullRequests: prValues.length };
}

export async function syncUserGitHub(userId: number): Promise<{ projects: number; issues: number; pullRequests: number; username: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const workspace = await getOrCreateWorkspace(db, userId);

  const [connection] = await db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.userId, userId))
    .limit(1);
  if (!connection) throw new Error("No GitHub connection for this account");

  const accessToken = decryptSecret(connection.accessTokenEnc);
  const me = await githubApi<GitHubUser>("/user", accessToken);

  // Most-recently-pushed repos first; cap so a single sync stays well inside
  // the authenticated rate limit (~40 repos + 1 call each = ~42 requests).
  const repos = await githubApi<GitHubRepo[]>("/user/repos?affiliation=owner,collaborator&sort=pushed&per_page=100", accessToken);
  const capped = repos.slice(0, 40);

  const byRepo = new Map<string, GitHubIssueOrPr[]>();
  for (const repo of capped) {
    const records = await githubApi<GitHubIssueOrPr[]>(`/repos/${repo.full_name}/issues?state=open&per_page=100`, accessToken);
    byRepo.set(repo.full_name, records);
  }

  const summary = await storeGithubSnapshot(db, workspace.id, { repos: capped, byRepo });

  await db
    .update(workspaces)
    .set({ githubLastSyncedAt: new Date() })
    .where(eq(workspaces.id, workspace.id));
  await db
    .update(githubConnections)
    .set({ githubUsername: me.login, updatedAt: new Date() })
    .where(eq(githubConnections.userId, userId));

  return { ...summary, username: me.login };
}

export async function disconnectUserGitHub(userId: number): Promise<{ connected: false }> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const workspace = await getOrCreateWorkspace(db, userId);
  await db.delete(githubConnections).where(eq(githubConnections.userId, userId));
  await db.delete(pullRequests).where(and(eq(pullRequests.workspaceId, workspace.id), eq(pullRequests.source, "github")));
  await db.delete(issues).where(and(eq(issues.workspaceId, workspace.id), eq(issues.source, "github")));
  await db.delete(projects).where(and(eq(projects.workspaceId, workspace.id), eq(projects.source, "github")));
  await db
    .update(workspaces)
    .set({ githubConnected: 0, githubProvider: null, githubAccountLogin: null, githubLastSyncedAt: null })
    .where(eq(workspaces.id, workspace.id));
  return { connected: false };
}

function stateCookieValue(req: Request): string | undefined {
  // The server does not mount cookie-parser; parse the state cookie from the
  // raw header so the OAuth CSRF nonce round-trip works without extra deps.
  const header = req.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === GITHUB_STATE_COOKIE) {
      const value = rawValue.join("=");
      try { return decodeURIComponent(value); } catch { return value; }
    }
  }
  return undefined;
}

async function sessionUserFromRequest(req: Request) {
  const auth = getBetterAuth();
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session?.user ?? null;
}

export async function handleGithubConnect(_req: Request, res: Response) {
  if (!isGithubConfigured()) {
    return res.redirect(appPath(`/dashboard/settings?github=unconfigured`));
  }
  const state = randomBytes(24).toString("hex");
  res.cookie(GITHUB_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: ENV.nodeEnv === "production",
    path: "/",
    maxAge: 10 * 60 * 1000,
  });
  return res.redirect(buildAuthorizeUrl(state));
}

export async function handleGithubCallback(req: Request, res: Response) {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const expectedState = stateCookieValue(req);
  res.clearCookie(GITHUB_STATE_COOKIE, { path: "/" });
  if (error) return res.redirect(appPath(`/dashboard/settings?github=denied`));
  if (!code || !state || state !== expectedState) return res.redirect(appPath(`/dashboard/settings?github=state_mismatch`));
  if (!isGithubConfigured()) return res.redirect(appPath(`/dashboard/settings?github=unconfigured`));

  const githubUser = await sessionUserFromRequest(req);
  if (!githubUser) return res.redirect(appPath(`/auth/sign-in?reason=github_connect`));

  try {
    const { accessToken, scopes } = await githubToken(code);
    const me = await githubApi<GitHubUser>("/user", accessToken);

    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    const openId = `better-auth:${githubUser.id}`;
    await upsertUser({ openId, name: githubUser.name, email: githubUser.email, loginMethod: "better-auth" });
    const appUser = (await getUserByOpenId(openId)) ?? null;
    if (!appUser) return res.redirect(appPath(`/dashboard/settings?github=account_error`));
    if (appUser.demo) return res.redirect(appPath(`/dashboard/settings?github=demo_blocked`));

    await db
      .insert(githubConnections)
      .values({
        userId: appUser.id,
        accessTokenEnc: encryptSecret(accessToken),
        githubUsername: me.login,
        scopes: scopes.join(", "),
        connectedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: { accessTokenEnc: encryptSecret(accessToken), githubUsername: me.login, scopes: scopes.join(", "), updatedAt: new Date() },
      });

    const workspace = await getOrCreateWorkspace(db, appUser.id, githubUser.name);
    await db
      .update(workspaces)
      .set({ githubConnected: 1, githubProvider: "github", githubAccountLogin: me.login, githubLastSyncedAt: null })
      .where(eq(workspaces.id, workspace.id));

    // Initial population happens server-side right after connect.
    try {
      await syncUserGitHub(appUser.id);
      return res.redirect(appPath(`/dashboard/settings?github=connected`));
    } catch (syncError) {
      console.error("[github] initial sync failed:", syncError);
      return res.redirect(appPath(`/dashboard/settings?github=connected_sync_failed`));
    }
  } catch (error) {
    console.error("[github] callback failed:", error);
    return res.redirect(appPath(`/dashboard/settings?github=error`));
  }
}
