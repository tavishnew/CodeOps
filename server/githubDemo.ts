export type DemoRepository = {
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  visibility: "private" | "public";
  openIssues: number;
  openPullRequests: number;
  latestCommit: string;
};

const DEMO_REPOSITORIES: DemoRepository[] = [
  { name: "axiom", fullName: "codeops-demo/axiom", url: "https://github.com/codeops-demo/axiom", defaultBranch: "main", visibility: "private", openIssues: 1, openPullRequests: 1, latestCommit: "8fa2c1" },
  { name: "autoqa", fullName: "codeops-demo/autoqa", url: "https://github.com/codeops-demo/autoqa", defaultBranch: "main", visibility: "public", openIssues: 1, openPullRequests: 1, latestCommit: "3d91a4" },
  { name: "notely", fullName: "codeops-demo/notely", url: "https://github.com/codeops-demo/notely", defaultBranch: "main", visibility: "private", openIssues: 0, openPullRequests: 0, latestCommit: "c41a90" },
  { name: "signaldock", fullName: "codeops-demo/signaldock", url: "https://github.com/codeops-demo/signaldock", defaultBranch: "main", visibility: "private", openIssues: 0, openPullRequests: 0, latestCommit: "b7d2ee" },
];

export function listDemoRepositories() {
  return DEMO_REPOSITORIES.map(repository => ({ ...repository }));
}

export function getDemoRepository(name: string) {
  return DEMO_REPOSITORIES.find(repository => repository.name === name);
}

export function selectDemoRepositories(names: string[]) {
  const uniqueNames = Array.from(new Set(names));
  const repositories = uniqueNames.map(name => getDemoRepository(name));
  if (repositories.some(repository => !repository)) throw new Error("One or more selected demo repositories are unavailable.");
  if (!repositories.length) throw new Error("Select at least one demo repository to synchronize.");
  return repositories as DemoRepository[];
}

export function demoSyncSummary(repositories: DemoRepository[]) {
  return {
    provider: "github-demo" as const,
    mode: "demo" as const,
    repositoryCount: repositories.length,
    syncedProjectCount: repositories.length,
    syncedAt: new Date(),
    message: "Demo repository catalog synchronized locally. Add GitHub OAuth credentials to enable live synchronization.",
  };
}
