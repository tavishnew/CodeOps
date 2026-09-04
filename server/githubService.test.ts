import { describe, expect, it } from "vitest";
import { GITHUB_SCOPES, mapIssueToRow, mapPrToRow, mapRepoToProject } from "./githubService";

describe("GitHub snapshot mapping helpers", () => {
  const repo = {
    id: 1,
    full_name: "octo/codeops",
    name: "codeops",
    html_url: "https://github.com/octo/codeops",
    description: "Operations dashboard",
    pushed_at: null,
  };

  it("maps a GitHub repo to a project row", () => {
    expect(mapRepoToProject(repo)).toEqual({
      name: "codeops",
      repositoryUrl: "https://github.com/octo/codeops",
      description: "Operations dashboard",
    });
  });

  it("maps a plain issue to an issue row with a GH-prefixed key", () => {
    const issue = {
      id: 10,
      number: 42,
      title: "Fix the retry loop",
      state: "open",
      html_url: "https://github.com/octo/codeops/issues/42",
      created_at: "2026-08-01T00:00:00Z",
    };
    expect(mapIssueToRow(repo, issue)).toEqual({ key: "GH-42", title: "Fix the retry loop" });
  });

  it("maps a PR-shaped issue to a pull-request row", () => {
    const pr = {
      id: 11,
      number: 7,
      title: "Harden the auth boundary",
      state: "open",
      html_url: "https://github.com/octo/codeops/pull/7",
      pull_request: { url: "https://api.github.com/repos/octo/codeops/pulls/7" },
      created_at: "2026-08-01T00:00:00Z",
    };
    expect(mapPrToRow(repo, pr)).toEqual({ number: 7, title: "Harden the auth boundary", status: "open" });
  });

  it("keeps closed PR state through the mapping", () => {
    const closed = {
      id: 12,
      number: 8,
      title: "Merged quietly",
      state: "closed",
      html_url: "https://github.com/octo/codeops/pull/8",
      pull_request: { url: "https://api.github.com/repos/octo/codeops/pulls/8" },
      created_at: "2026-08-01T00:00:00Z",
    };
    expect(mapPrToRow(repo, closed).status).toBe("closed");
  });

  it("requests only the scopes the dashboard needs", () => {
    expect(GITHUB_SCOPES.split(" ").sort()).toEqual(["read:user", "repo"].sort());
  });
});
