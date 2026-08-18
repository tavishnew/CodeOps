import { describe, expect, it } from "vitest";
import { projects, workspaces } from "../drizzle/schema";
import { persistGithubSync } from "./db";
import { selectDemoRepositories } from "./githubDemo";

describe("GitHub demo synchronization persistence", () => {
  it("persists connection metadata and selected project repository URLs", async () => {
    const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
    const fakeDb = {
      update: (table: unknown) => ({
        set: (values: Record<string, unknown>) => ({ where: async () => { updates.push({ table, values }); } }),
      }),
      select: () => ({
        from: (table: unknown) => ({
          where: () => ({ limit: async () => table === projects ? [{ id: 42 }] : [] }),
        }),
      }),
    };
    const syncedAt = new Date("2026-08-17T00:00:00.000Z");
    await persistGithubSync(fakeDb, 9, selectDemoRepositories(["axiom", "autoqa"]), syncedAt);
    expect(updates[0]).toMatchObject({ table: workspaces, values: { githubConnected: 1, githubProvider: "github-demo", githubAccountLogin: "codeops-demo", githubLastSyncedAt: syncedAt } });
    expect(updates.slice(1)).toHaveLength(2);
    expect(updates.slice(1).map(update => update.values.repositoryUrl)).toEqual(["https://github.com/codeops-demo/axiom", "https://github.com/codeops-demo/autoqa"]);
  });

  it("fails before persistence when the selection is empty or unknown", () => {
    expect(() => selectDemoRepositories([])).toThrow("Select at least one");
    expect(() => selectDemoRepositories(["unknown"])).toThrow("unavailable");
  });
});
