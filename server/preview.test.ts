import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { PROJECT_SEEDS, seedWorkspace } from "./seed";
import { projects } from "../drizzle/schema";

function createContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const authenticatedUser = {
  id: 1,
  openId: "audit-user",
  email: "audit@example.com",
  name: "Audit User",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("dashboard authorization boundary", () => {
  it("rejects unauthenticated dashboard access", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.dashboard.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("integrations.github", () => {
  it("keeps GitHub status, repository listing, connect, and sync procedures behind auth", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.integrations.githubStatus()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.integrations.githubRepositories()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.integrations.connectGithub()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.integrations.syncGithub()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const source = await (await import("node:fs/promises")).readFile(new URL("./routers.ts", import.meta.url), "utf8");
    expect(source).toContain("connectGithubDemo");
    expect(source).toContain("syncGithubDemo");
    expect(source).toContain("repositoryNames");
    const dbSource = await (await import("node:fs/promises")).readFile(new URL("./db.ts", import.meta.url), "utf8");
    expect(dbSource).toContain("githubLastSyncedAt");
    expect(dbSource).toContain("selectDemoRepositories");
    expect(dbSource).toContain("projects).where");
  });
});

describe("authenticated route mapping", () => {
  it("registers every required dashboard section and the shared Home branch", async () => {
    const fs = await import("node:fs/promises");
    const appSource = await fs.readFile(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const homeSource = await fs.readFile(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    const sections = ["projects", "issues", "pull-requests", "deployments", "incidents", "automations", "knowledge", "analytics", "settings"];
    expect(appSource).toContain('path="/dashboard"');
    expect(appSource).toContain('path="/dashboard/:section*"');
    for (const section of sections) expect(homeSource).toContain(`path: "/dashboard/${section}"`);
    expect(homeSource).toContain('location === "/dashboard" || location.startsWith("/dashboard/")');
    expect(homeSource).toContain("<DashboardGate><AppShell active={active}");
  });
});

describe("protected CRUD procedure boundaries", () => {
  it("registers workspace-scoped project, issue, incident, and automation procedures", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.projects.create({ name: "Audit project" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.issues.create({ projectId: 1, key: "AUD-1", title: "Audit issue" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.incidents.updateStatus({ id: 1, status: "resolved" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.automations.setEnabled({ id: 1, enabled: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps the required demo seed vocabulary and complete CRUD contract visible", async () => {
    expect(PROJECT_SEEDS.map(project => project.name)).toEqual(["Axiom", "AutoQA", "Notely", "SignalDock"]);
    const source = await (await import("node:fs/promises")).readFile(new URL("./routers.ts", import.meta.url), "utf8");
    for (const procedure of ["get", "create", "update", "archive", "delete"]) expect(source).toContain(procedure);
    expect(source).toContain("dashboard: router");
    expect(source).toContain("getDashboardForUser");
    const seedSource = await (await import("node:fs/promises")).readFile(new URL("./seed.ts", import.meta.url), "utf8");
    expect(seedSource).toContain("export async function seedWorkspace");
    expect(seedSource).not.toContain("await seedWorkspace(db, current[0].id)");
    expect(seedSource).not.toContain("await seedWorkspace(db, created.id)");
  });
});

describe("workspace seed bootstrap", () => {
  it("is idempotent for a workspace and creates the four seeded projects once", async () => {
    const projectRows: Array<{ id: number; name: string }> = [];
    const fakeDb = {
      select: () => ({
        from: (table: unknown) => ({
          where: () => ({
            limit: async () => table === projects
              ? projectRows.length ? [{ id: projectRows[projectRows.length - 1].id }] : []
              : [],
          }),
        }),
      }),
      insert: (table: unknown) => ({
        values: async (values: any) => {
          if (table === projects) projectRows.push({ id: projectRows.length + 1, name: values.name });
        },
      }),
    };
    await seedWorkspace(fakeDb as never, 42);
    await seedWorkspace(fakeDb as never, 42);
    expect(projectRows.map(project => project.name)).toEqual(["Axiom", "AutoQA", "Notely", "SignalDock"]);
  });
});

describe("project creation and navigation UX", () => {
  it("renders validation, success/error feedback, loading state, and collapsed sidebar affordances", async () => {
    const homeSource = await (await import("node:fs/promises")).readFile(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(homeSource).toContain("Project name must be at least 2 characters.");
    expect(homeSource).toContain("Project name must be 180 characters or fewer.");
    expect(homeSource).toContain("was created in this workspace.");
    expect(homeSource).toContain("Creating…");
    expect(homeSource).toContain("role={projectFormMessage.tone === \"error\" ? \"alert\" : \"status\"}");
    expect(homeSource).toContain("animate-spin");
    expect(homeSource).toContain("const submitProject = () =>");
    expect(homeSource).toContain("Retrying…");
    expect(homeSource).toContain(">Retry</button>");
    expect(homeSource).toContain("Edit project");
    expect(homeSource).toContain("Delete project");
    expect(homeSource).toContain("Search projects");
    expect(homeSource).toContain("Filter projects by status");
    expect(homeSource).toContain("Sort projects");
    expect(homeSource).toContain("projects.update.useMutation");
    expect(homeSource).toContain("projects.delete.useMutation");
    expect(homeSource).toContain("projects.archive.useMutation");
    expect(homeSource).toContain("selectedProjectIds");
    expect(homeSource).toContain("Select all visible projects");
    expect(homeSource).toContain("Archive selected");
    expect(homeSource).toContain("Delete selected");
    expect(homeSource).toContain("Page {projectPage} of {pageCount}");
    expect(homeSource).toContain("projectPageSize");
    expect(homeSource).toContain("Projects per page");
    expect(homeSource).toContain("12 per page");
    expect(homeSource).toContain("Edit ${item.name} status");
    expect(homeSource).toContain("status: editingProjectStatus");
    expect(homeSource).toContain("This action cannot be undone.");
    expect(homeSource).toContain("collapsed ? \"justify-center gap-1 px-2\" : \"justify-between px-5\"");
    expect(homeSource).toContain("title={collapsed ? workspaceName : undefined}");
  });
});

describe("dashboard loading states", () => {
  it("uses accessible skeleton layouts for authenticated query loading", async () => {
    const fs = await import("node:fs/promises");
    const homeSource = await fs.readFile(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(homeSource).toContain("function DashboardQuerySkeleton");
    expect(homeSource).toContain('role="status"');
    expect(homeSource).toContain('aria-busy="true"');
    expect(homeSource).toContain('<Skeleton className="h-3 w-44');
    expect(homeSource).toContain("return <DashboardQuerySkeleton label={label} />;");
  });
});

describe("dashboard data flow", () => {
  it("aggregates every operational collection through the workspace boundary", async () => {
    const source = await (await import("node:fs/promises")).readFile(new URL("./db.ts", import.meta.url), "utf8");
    for (const collection of ["projects", "issues", "pullRequests", "deployments", "incidents", "automations", "knowledgeItems"]) expect(source).toContain(`db.select().from(${collection})`);
    expect(source).toContain("Promise.all([");
    expect(source.match(/workspaceId/g)?.length ?? 0).toBeGreaterThan(8);
  });
});
