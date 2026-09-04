import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, automations, automationRuns, deployments, githubConnections, incidents, insights, issues, knowledgeItems, projects, pullRequests, users, workspaces } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getOrCreateWorkspace } from "./seed";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try { _db = drizzle(ENV.databaseUrl); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const values: InsertUser = { openId: user.openId, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn };
  if (user.role) { values.role = user.role; updateSet.role = user.role; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return rows[0];
}

export async function getWorkspaceForUser(userId: number, ownerName?: string | null) {
  return getOrCreateWorkspace(await getDb(), userId, ownerName);
}

export async function getDashboardForUser(userId: number, ownerName?: string | null) {
  const db = await getDb(); if (!db) throw new Error("Database is unavailable");
  const workspace = await getOrCreateWorkspace(db, userId, ownerName);
  const [projectRows, issueRows, prRows, deploymentRows, incidentRows, automationRows, knowledgeRows] = await Promise.all([
    db.select().from(projects).where(eq(projects.workspaceId, workspace.id)).orderBy(desc(projects.updatedAt)),
    db.select().from(issues).where(eq(issues.workspaceId, workspace.id)).orderBy(desc(issues.updatedAt)),
    db.select().from(pullRequests).where(eq(pullRequests.workspaceId, workspace.id)).orderBy(desc(pullRequests.updatedAt)),
    db.select().from(deployments).where(eq(deployments.workspaceId, workspace.id)).orderBy(desc(deployments.createdAt)),
    db.select().from(incidents).where(eq(incidents.workspaceId, workspace.id)).orderBy(desc(incidents.updatedAt)),
    db.select().from(automations).where(eq(automations.workspaceId, workspace.id)).orderBy(desc(automations.updatedAt)),
    db.select().from(knowledgeItems).where(eq(knowledgeItems.workspaceId, workspace.id)).orderBy(desc(knowledgeItems.createdAt)),
  ]);
  return { workspace, projects: projectRows, issues: issueRows, pullRequests: prRows, deployments: deploymentRows, incidents: incidentRows, automations: automationRows, knowledge: knowledgeRows };
}

export async function createProject(userId: number, input: { name: string; description?: string; repositoryUrl?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database is unavailable");
  const workspace = await getOrCreateWorkspace(db, userId);
  await db.insert(projects).values({ workspaceId: workspace.id, name: input.name, description: input.description ?? null, repositoryUrl: input.repositoryUrl ?? null });
  const rows = await db.select().from(projects).where(and(eq(projects.workspaceId, workspace.id), eq(projects.name, input.name))).orderBy(desc(projects.id)).limit(1); return rows[0];
}
export async function updateProject(userId: number, id: number, input: { name?: string; description?: string; repositoryUrl?: string; status?: "on_track" | "watch" | "at_risk" }) {
  const db = await getDb(); if (!db) throw new Error("Database is unavailable"); const workspace = await getOrCreateWorkspace(db, userId);
  await db.update(projects).set(input).where(and(eq(projects.id, id), eq(projects.workspaceId, workspace.id))); const rows = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.workspaceId, workspace.id))).limit(1); return rows[0];
}
export async function archiveProject(userId: number, id: number) { const db = await getDb(); if (!db) throw new Error("Database is unavailable"); const workspace = await getOrCreateWorkspace(db, userId); await db.update(projects).set({ status: "at_risk" }).where(and(eq(projects.id, id), eq(projects.workspaceId, workspace.id))); return { success: true }; }
export async function getProject(userId: number, id: number) { const db = await getDb(); if (!db) throw new Error("Database is unavailable"); const workspace = await getOrCreateWorkspace(db, userId); return (await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.workspaceId, workspace.id))).limit(1))[0]; }
export async function deleteProject(userId: number, id: number) { const db = await getDb(); if (!db) throw new Error("Database is unavailable"); const workspace = await getOrCreateWorkspace(db, userId); await db.delete(projects).where(and(eq(projects.id, id), eq(projects.workspaceId, workspace.id))); return { success: true }; }
export async function createIssue(userId: number, input: { projectId: number; key: string; title: string; description?: string; priority?: "low" | "medium" | "high" }) { const db = await getDb(); if (!db) throw new Error("Database is unavailable"); const workspace = await getOrCreateWorkspace(db, userId); await db.insert(issues).values({ workspaceId: workspace.id, projectId: input.projectId, key: input.key, title: input.title, description: input.description ?? null, priority: input.priority ?? "medium" }); const rows = await db.select().from(issues).where(and(eq(issues.workspaceId, workspace.id), eq(issues.key, input.key))).orderBy(desc(issues.id)).limit(1); return rows[0]; }
export async function updateIssue(userId: number, id: number, input: { title?: string; description?: string; status?: "open" | "in_progress" | "closed"; priority?: "low" | "medium" | "high" }) { const db = await getDb(); if (!db) throw new Error("Database is unavailable"); const workspace = await getOrCreateWorkspace(db, userId); await db.update(issues).set(input).where(and(eq(issues.id, id), eq(issues.workspaceId, workspace.id))); const rows = await db.select().from(issues).where(and(eq(issues.id, id), eq(issues.workspaceId, workspace.id))).limit(1); return rows[0]; }
export async function getIssue(userId: number, id: number) { const db = await getDb(); if (!db) throw new Error("Database is unavailable"); const workspace = await getOrCreateWorkspace(db, userId); return (await db.select().from(issues).where(and(eq(issues.id, id), eq(issues.workspaceId, workspace.id))).limit(1))[0]; }
export async function deleteIssue(userId: number, id: number) { const db = await getDb(); if (!db) throw new Error("Database is unavailable"); const workspace = await getOrCreateWorkspace(db, userId); await db.delete(issues).where(and(eq(issues.id, id), eq(issues.workspaceId, workspace.id))); return { success: true }; }
export async function updateIncident(userId: number, id: number, status: "investigating" | "identified" | "monitoring" | "resolved") { const db = await getDb(); if (!db) throw new Error("Database is unavailable"); const workspace = await getOrCreateWorkspace(db, userId); await db.update(incidents).set({ status }).where(and(eq(incidents.id, id), eq(incidents.workspaceId, workspace.id))); const rows = await db.select().from(incidents).where(and(eq(incidents.id, id), eq(incidents.workspaceId, workspace.id))).limit(1); return rows[0]; }
export async function setAutomationEnabled(userId: number, id: number, enabled: boolean) { const db = await getDb(); if (!db) throw new Error("Database is unavailable"); const workspace = await getOrCreateWorkspace(db, userId); await db.update(automations).set({ enabled: enabled ? 1 : 0 }).where(and(eq(automations.id, id), eq(automations.workspaceId, workspace.id))); const rows = await db.select().from(automations).where(and(eq(automations.id, id), eq(automations.workspaceId, workspace.id))).limit(1); return rows[0]; }
export async function runAutomation(userId: number, id: number) { const db = await getDb(); if (!db) throw new Error("Database is unavailable"); const workspace = await getOrCreateWorkspace(db, userId); const automation = (await db.select().from(automations).where(and(eq(automations.id, id), eq(automations.workspaceId, workspace.id))).limit(1))[0]; if (!automation) return undefined; await db.insert(automationRuns).values({ automationId: automation.id, workspaceId: workspace.id, status: "succeeded", result: "Internal preview run recorded; no external action executed." }); return automation; }


export async function getGithubIntegration(userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database is unavailable");
  const workspace = await getOrCreateWorkspace(db, userId);
  // The github_connections row is the source of truth; workspace columns only
  // keep the last-sync timestamp for display.
  const [connection] = await db
    .select({ githubUsername: githubConnections.githubUsername, scopes: githubConnections.scopes })
    .from(githubConnections)
    .where(eq(githubConnections.userId, userId))
    .limit(1);
  const [account] = await db.select({ demo: users.demo }).from(users).where(eq(users.id, userId)).limit(1);
  const configured = Boolean(ENV.github.clientId && ENV.github.clientSecret && ENV.github.callbackUrl);
  return {
    connected: Boolean(connection),
    provider: connection ? ("github" as const) : null,
    accountLogin: connection?.githubUsername ?? null,
    lastSyncedAt: workspace.githubLastSyncedAt ?? null,
    scopes: connection?.scopes ?? null,
    configured,
    demo: Boolean(account?.demo),
  };
}

export async function listProjects(userId: number) { const data = await getDashboardForUser(userId); return data.projects; }
export async function listIssues(userId: number) { const data = await getDashboardForUser(userId); return data.issues; }
export async function listPullRequests(userId: number) { const data = await getDashboardForUser(userId); return data.pullRequests; }
export async function listDeployments(userId: number) { const data = await getDashboardForUser(userId); return data.deployments; }
export async function listIncidents(userId: number) { const data = await getDashboardForUser(userId); return data.incidents; }
export async function listAutomations(userId: number) { const data = await getDashboardForUser(userId); return data.automations; }
export async function listKnowledge(userId: number) { const data = await getDashboardForUser(userId); return data.knowledge; }

export async function getWorkspaceEntity<T extends { id: number; workspaceId: number }>(userId: number, id: number, table: any) {
  const db = await getDb(); if (!db) throw new Error("Database is unavailable");
  const workspace = await getOrCreateWorkspace(db, userId);
  return (await db.select().from(table).where(and(eq(table.id, id), eq(table.workspaceId, workspace.id))).limit(1))[0] as T | undefined;
}
export async function getPullRequest(userId: number, id: number) { return getWorkspaceEntity(userId, id, pullRequests); }
export async function getDeployment(userId: number, id: number) { return getWorkspaceEntity(userId, id, deployments); }
export async function getIncident(userId: number, id: number) { return getWorkspaceEntity(userId, id, incidents); }
export async function getAutomation(userId: number, id: number) { return getWorkspaceEntity(userId, id, automations); }
export async function getKnowledgeItem(userId: number, id: number) { return getWorkspaceEntity(userId, id, knowledgeItems); }

export async function listInsights(userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database is unavailable");
  const workspace = await getOrCreateWorkspace(db, userId);
  return db.select().from(insights).where(eq(insights.workspaceId, workspace.id)).orderBy(desc(insights.createdAt));
}
export async function getInsight(userId: number, id: number) { return getWorkspaceEntity(userId, id, insights); }
export async function createInsight(userId: number, input: { projectId?: number | null; title: string; description?: string; severity?: "low" | "medium" | "high"; confidence?: string; sourceRef?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database is unavailable");
  const workspace = await getOrCreateWorkspace(db, userId);
  const values = { workspaceId: workspace.id, projectId: input.projectId ?? null, title: input.title, description: input.description ?? null, severity: input.severity ?? "medium", confidence: input.confidence ?? null, sourceRef: input.sourceRef ?? null };
  const [result] = await db.insert(insights).values(values);
  return (await db.select().from(insights).where(eq(insights.id, result.insertId)).limit(1))[0];
}
export async function updateInsight(userId: number, id: number, input: { projectId?: number | null; title?: string; description?: string | null; severity?: "low" | "medium" | "high"; confidence?: string | null; sourceRef?: string | null }) {
  const db = await getDb(); if (!db) throw new Error("Database is unavailable");
  const workspace = await getOrCreateWorkspace(db, userId);
  const set: Record<string, unknown> = {};
  if (input.projectId !== undefined) set.projectId = input.projectId;
  if (input.title !== undefined) set.title = input.title;
  if (input.description !== undefined) set.description = input.description;
  if (input.severity !== undefined) set.severity = input.severity;
  if (input.confidence !== undefined) set.confidence = input.confidence;
  if (input.sourceRef !== undefined) set.sourceRef = input.sourceRef;
  await db.update(insights).set(set).where(and(eq(insights.id, id), eq(insights.workspaceId, workspace.id)));
  return (await db.select().from(insights).where(and(eq(insights.id, id), eq(insights.workspaceId, workspace.id))).limit(1))[0];
}
export async function deleteInsight(userId: number, id: number) {
  const db = await getDb(); if (!db) throw new Error("Database is unavailable");
  const workspace = await getOrCreateWorkspace(db, userId);
  await db.delete(insights).where(and(eq(insights.id, id), eq(insights.workspaceId, workspace.id)));
  return { success: true };
}

export async function getAnalyticsForUser(userId: number) {
  const data = await getDashboardForUser(userId);
  return {
    projects: data.projects.length,
    openIssues: data.issues.filter((row: any) => row.status !== "closed").length,
    pullRequests: data.pullRequests.length,
    deployments: data.deployments.length,
    activeIncidents: data.incidents.filter((row: any) => row.status !== "resolved").length,
    enabledAutomations: data.automations.filter((row: any) => Boolean(row.enabled)).length,
    knowledgeItems: data.knowledge.length,
  };
}
