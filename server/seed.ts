import { and, eq } from "drizzle-orm";
import { automations, deployments, incidents, insights, issues, knowledgeItems, projects, pullRequests, workspaces } from "../drizzle/schema";
import type { getDb } from "./db";

export const PROJECT_SEEDS = [
  { name: "Axiom", status: "on_track" as const, description: "Authorization surface with a stable release thread.", repositoryUrl: "https://github.com/example/axiom" },
  { name: "AutoQA", status: "watch" as const, description: "Test automation with a retry-regression signal to inspect.", repositoryUrl: "https://github.com/example/autoqa" },
  { name: "Notely", status: "on_track" as const, description: "Notes and context capture with quiet delivery health.", repositoryUrl: "https://github.com/example/notely" },
  { name: "SignalDock", status: "at_risk" as const, description: "Event routing where incident context needs attention.", repositoryUrl: "https://github.com/example/signaldock" },
];

export async function seedWorkspace(db: Awaited<ReturnType<typeof getDb>>, workspaceId: number) {
  if (!db) return;
  const existing = await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId)).limit(1);
  if (existing.length) return;

  const projectIds: Record<string, number> = {};
  for (const project of PROJECT_SEEDS) {
    await db.insert(projects).values({ workspaceId, ...project });
    const [created] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.workspaceId, workspaceId), eq(projects.name, project.name))).limit(1);
    if (created) projectIds[project.name] = created.id;
  }

  await db.insert(issues).values([
    { workspaceId, projectId: projectIds.Axiom, key: "AX-318", title: "API request failures", description: "Request failures after authentication middleware change.", status: "in_progress", priority: "high" },
    { workspaceId, projectId: projectIds.AutoQA, key: "QA-087", title: "Retry regression clusters", description: "Investigate flaky request retry behavior.", status: "open", priority: "medium" },
  ]);
  await db.insert(pullRequests).values([
    { workspaceId, projectId: projectIds.Axiom, number: 142, title: "Harden auth middleware boundary", status: "merged", risk: "high" },
    { workspaceId, projectId: projectIds.AutoQA, number: 87, title: "Stabilize retry assertions", status: "open", risk: "medium" },
  ]);
  await db.insert(deployments).values([
    { workspaceId, projectId: projectIds.Axiom, externalId: "DEP-208", environment: "production", version: "2.4.0", commitSha: "8fa2c1", status: "successful", duration: "04m 12s" },
    { workspaceId, projectId: projectIds.AutoQA, externalId: "DEP-207", environment: "staging", version: "1.8.2", commitSha: "3d91a4", status: "watch", duration: "06m 44s" },
  ]);
  await db.insert(incidents).values({ workspaceId, projectId: projectIds.Axiom, key: "INC-042", title: "API request failures", description: "Request failures appeared after an authentication middleware change. Evidence is linked to repository history and runbooks.", severity: "high", status: "investigating", service: "API gateway" });
  await db.insert(automations).values([
    { workspaceId, name: "PR risk review", trigger: "Pull request opened", actions: JSON.stringify(["AI review", "risk assessment", "notify team"]), enabled: 0 },
    { workspaceId, name: "Failed deploy investigation", trigger: "Deployment failed", actions: JSON.stringify(["investigate", "create incident", "notify team"]), enabled: 0 },
  ]);
  await db.insert(knowledgeItems).values([
    { workspaceId, projectId: projectIds.Axiom, type: "repository", label: "Repository files", sourceRef: "repo://axiom", content: "34 files indexed for future retrieval." },
    { workspaceId, projectId: projectIds.Axiom, type: "runbook", label: "Runbooks", sourceRef: "runbook://api-errors", content: "API error response and rollback guidance." },
    { workspaceId, projectId: projectIds.Axiom, type: "incident", label: "Incident precedent", sourceRef: "incident://INC-042", content: "Prior auth middleware signal." },
  ]);
  await db.insert(insights).values([
    { workspaceId, projectId: projectIds.Axiom, title: "Elevated deployment risk", description: "High-risk auth change follows three related issues.", severity: "high", confidence: "0.82 preview", sourceRef: "PR #142" },
    { workspaceId, projectId: projectIds.AutoQA, title: "Regression pattern detected", description: "Test flake clusters around request retries.", severity: "medium", confidence: "0.71 preview", sourceRef: "last 24h" },
    { workspaceId, projectId: projectIds.SignalDock, title: "Knowledge context ready", description: "Runbook and incident precedent are indexed.", severity: "low", confidence: "0.89 preview", sourceRef: "8 sources" },
  ]);
}

export async function getOrCreateWorkspace(db: Awaited<ReturnType<typeof getDb>>, userId: number, ownerName?: string | null) {
  if (!db) throw new Error("Database is unavailable");
  const current = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1);
  if (current[0]) {
    return current[0];
  }
  const slug = `workspace-${userId}`;
  await db.insert(workspaces).values({ ownerId: userId, slug, name: ownerName ? `${ownerName}'s engineering` : "Engineering workspace", mode: "connected" });
  const [created] = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1);
  if (!created) throw new Error("Workspace could not be created");
  const freshWorkspace = created;
  await seedWorkspace(db, freshWorkspace.id);
  return created;
}
