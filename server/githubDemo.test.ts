import { describe, expect, it } from "vitest";
import { demoSyncSummary, listDemoRepositories, selectDemoRepositories } from "./githubDemo";

describe("GitHub demo repository adapter", () => {
  it("returns a stable repository catalog with safe URLs and branches", () => {
    const repositories = listDemoRepositories();
    expect(repositories).toHaveLength(4);
    expect(repositories.map(repository => repository.name)).toEqual(["axiom", "autoqa", "notely", "signaldock"]);
    expect(repositories.every(repository => repository.url.startsWith("https://github.com/"))).toBe(true);
    expect(repositories.every(repository => repository.defaultBranch === "main")).toBe(true);
  });

  it("selects only requested repositories and rejects invalid or empty selections", () => {
    expect(selectDemoRepositories(["axiom", "notely"]).map(repository => repository.name)).toEqual(["axiom", "notely"]);
    expect(() => selectDemoRepositories([])).toThrow("Select at least one");
    expect(() => selectDemoRepositories(["missing"])).toThrow("unavailable");
  });

  it("marks synchronization as demo-only and reports live OAuth as a later boundary", () => {
    const result = demoSyncSummary(listDemoRepositories());
    expect(result.provider).toBe("github-demo");
    expect(result.mode).toBe("demo");
    expect(result.repositoryCount).toBe(4);
    expect(result.message).toContain("Add GitHub OAuth credentials");
  });
});
