import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const repository = vi.hoisted(() => ({
  getProject: vi.fn(async (_userId: number, id: number) => ({ id, workspaceId: 7, name: "Axiom" })),
  createProject: vi.fn(async (userId: number, input: { name: string }) => ({ id: 9, workspaceId: userId, name: input.name })),
  updateProject: vi.fn(async (_userId: number, id: number) => ({ id, workspaceId: 7, name: "Axiom updated" })),
  deleteProject: vi.fn(async () => ({ success: true })),
  getIssue: vi.fn(async (_userId: number, id: number) => ({ id, workspaceId: 7, key: "AX-318", title: "API request failures" })),
  createIssue: vi.fn(async (userId: number, input: { key: string; title: string }) => ({ id: 10, workspaceId: userId, key: input.key, title: input.title })),
  updateIssue: vi.fn(async (_userId: number, id: number) => ({ id, workspaceId: 7, key: "AX-318", title: "API request failures updated" })),
  deleteIssue: vi.fn(async () => ({ success: true })),
  getDashboardForUser: vi.fn(async () => ({ workspace: { id: 7, name: "Engineering workspace" }, projects: [{ id: 1, name: "Axiom", status: "on_track" }], issues: [{ id: 2, key: "AX-318", title: "API request failures", priority: "high" }], pullRequests: [{ id: 3, number: 142, title: "Harden auth middleware boundary", status: "merged" }], deployments: [{ id: 4, externalId: "DEP-208", environment: "production", status: "successful" }], incidents: [{ id: 5, key: "INC-042", status: "investigating", severity: "high" }], automations: [{ id: 6, name: "PR risk review", enabled: 0 }], knowledge: [{ id: 7, label: "Repository files", type: "repository" }] })),
}));

vi.mock("./db", () => ({
  ...repository,
  archiveProject: vi.fn(async () => ({ success: true })),
  getWorkspaceForUser: vi.fn(async () => ({ id: 7, name: "Engineering workspace" })),
  updateIncident: vi.fn(async () => ({ id: 5, status: "resolved" })),
  runAutomation: vi.fn(async () => ({ id: 6 })),
  setAutomationEnabled: vi.fn(async () => ({ id: 6, enabled: 1 })),
  getAnalyticsForUser: vi.fn(async () => ({ projects: 1, openIssues: 1, pullRequests: 1, deployments: 1, activeIncidents: 1, enabledAutomations: 0, knowledgeItems: 1 })),
  listProjects: vi.fn(async () => [{ id: 1, name: "Axiom", status: "on_track" }]),
  listIssues: vi.fn(async () => [{ id: 2, key: "AX-318", title: "API request failures", priority: "high" }]),
  listPullRequests: vi.fn(async () => [{ id: 3, number: 142, title: "Harden auth middleware boundary", status: "merged" }]),
  listDeployments: vi.fn(async () => [{ id: 4, externalId: "DEP-208", environment: "production", status: "successful" }]),
  listIncidents: vi.fn(async () => [{ id: 5, key: "INC-042", status: "investigating", severity: "high" }]),
  listAutomations: vi.fn(async () => [{ id: 6, name: "PR risk review", enabled: 0 }]),
  listKnowledge: vi.fn(async () => [{ id: 7, label: "Repository files", type: "repository" }]),
  getPullRequest: vi.fn(async (_userId: number, id: number) => ({ id, workspaceId: 7, number: 142, title: "Harden auth middleware boundary" })),
  getDeployment: vi.fn(async (_userId: number, id: number) => ({ id, workspaceId: 7, externalId: "DEP-208", status: "successful" })),
  getIncident: vi.fn(async (_userId: number, id: number) => ({ id, workspaceId: 7, key: "INC-042", status: "investigating" })),
  getAutomation: vi.fn(async (_userId: number, id: number) => ({ id, workspaceId: 7, name: "PR risk review", enabled: 0 })),
  getKnowledgeItem: vi.fn(async (_userId: number, id: number) => ({ id, workspaceId: 7, label: "Repository files", type: "repository" })),
  listInsights: vi.fn(async () => [{ id: 1, title: "Elevated deployment risk", severity: "high" }]),
  getInsight: vi.fn(async (_userId: number, id: number) => ({ id, workspaceId: 7, title: "Elevated deployment risk", severity: "high" })),
  createInsight: vi.fn(async (userId: number, input: { title: string }) => ({ id: 11, workspaceId: userId, title: input.title })),
  updateInsight: vi.fn(async (_userId: number, id: number) => ({ id, workspaceId: 7, title: "Elevated deployment risk updated" })),
  deleteInsight: vi.fn(async () => ({ success: true })),
  getGithubIntegration: vi.fn(async () => ({ connected: false, provider: null, accountLogin: null, lastSyncedAt: null, scopes: null, configured: false, demo: false })),
  getDb: vi.fn(async () => undefined),
  getUserByOpenId: vi.fn(async () => undefined),
  upsertUser: vi.fn(async () => undefined),
}));

const user = { id: 42, openId: "contract-user", email: "contract@example.com", name: "Contract User", loginMethod: "better-auth", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
function context(): TrpcContext { return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] }; }

describe("authenticated repository contract", () => {
  it("executes project and issue CRUD calls with the authenticated user scope", async () => {
    const caller = appRouter.createCaller(context());
    expect((await caller.projects.create({ name: "Contract project" })).name).toBe("Contract project");
    expect((await caller.projects.get({ id: 1 })).workspaceId).toBe(7);
    expect((await caller.projects.update({ id: 1, data: { name: "Axiom updated" } })).name).toContain("updated");
    expect(await caller.projects.delete({ id: 1 })).toEqual({ success: true });
    expect((await caller.issues.create({ projectId: 1, key: "CON-1", title: "Contract issue" })).key).toBe("CON-1");
    expect((await caller.issues.get({ id: 2 })).key).toBe("AX-318");
    expect((await caller.issues.update({ id: 2, data: { title: "API request failures updated" } })).title).toContain("updated");
    expect(await caller.issues.delete({ id: 2 })).toEqual({ success: true });
    expect(repository.createProject).toHaveBeenCalledWith(42, { name: "Contract project" });
    expect(repository.createIssue).toHaveBeenCalledWith(42, { projectId: 1, key: "CON-1", title: "Contract issue" });
  });

  it("returns all dashboard collections through the protected overview procedure", async () => {
    const result = await appRouter.createCaller(context()).dashboard.overview();
    expect(Object.keys(result)).toEqual(["workspace", "projects", "issues", "pullRequests", "deployments", "incidents", "automations", "knowledge"]);
    expect(result.projects).toEqual([{ id: 1, name: "Axiom", status: "on_track" }]);
    expect(result.issues).toEqual([{ id: 2, key: "AX-318", title: "API request failures", priority: "high" }]);
    expect(result.pullRequests).toEqual([{ id: 3, number: 142, title: "Harden auth middleware boundary", status: "merged" }]);
    expect(result.deployments).toEqual([{ id: 4, externalId: "DEP-208", environment: "production", status: "successful" }]);
    expect(result.incidents).toEqual([{ id: 5, key: "INC-042", status: "investigating", severity: "high" }]);
    expect(result.automations).toEqual([{ id: 6, name: "PR risk review", enabled: 0 }]);
    expect(result.knowledge).toEqual([{ id: 7, label: "Repository files", type: "repository" }]);
    for (const collection of [result.projects, result.issues, result.pullRequests, result.deployments, result.incidents, result.automations, result.knowledge]) expect(Array.isArray(collection)).toBe(true);
    expect(repository.getDashboardForUser).toHaveBeenCalledWith(42, "Contract User");
  });
});

  it("returns representative list and detail shapes for every operational entity", async () => {
    const caller = appRouter.createCaller(context());
    const [pullRequests, deployments, incidents, automations, knowledge] = await Promise.all([
      caller.pullRequests.list(),
      caller.deployments.list(),
      caller.incidents.list(),
      caller.automations.list(),
      caller.knowledge.list(),
    ]);
    expect(pullRequests[0]).toMatchObject({ number: 142, status: "merged" });
    expect(deployments[0]).toMatchObject({ externalId: "DEP-208", environment: "production" });
    expect(incidents[0]).toMatchObject({ key: "INC-042", severity: "high" });
    expect(automations[0]).toMatchObject({ name: "PR risk review", enabled: 0 });
    expect(knowledge[0]).toMatchObject({ label: "Repository files", type: "repository" });
    await expect(caller.pullRequests.get({ id: 3 })).resolves.toMatchObject({ number: 142, workspaceId: 7 });
    await expect(caller.deployments.get({ id: 4 })).resolves.toMatchObject({ externalId: "DEP-208", workspaceId: 7 });
    await expect(caller.incidents.get({ id: 5 })).resolves.toMatchObject({ key: "INC-042", workspaceId: 7 });
    await expect(caller.automations.get({ id: 6 })).resolves.toMatchObject({ name: "PR risk review", workspaceId: 7 });
    await expect(caller.knowledge.get({ id: 7 })).resolves.toMatchObject({ label: "Repository files", workspaceId: 7 });
  });
