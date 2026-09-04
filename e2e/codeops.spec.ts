import { expect, test, type Page, type Route } from "@playwright/test";

type Project = {
  id: number;
  name: string;
  status: "on_track" | "watch" | "at_risk";
  createdAt: string;
};

const projects: Project[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  name: `Workspace Project ${index + 1}`,
  status: index % 3 === 0 ? "at_risk" : index % 2 === 0 ? "watch" : "on_track",
  createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
}));

const user = {
  id: "e2e-user",
  name: "E2E User",
  email: "e2e@example.com",
};

function trpcEnvelope(data: unknown) {
  return { result: { data: { json: data } } };
}

async function fulfillTrpc(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(trpcEnvelope(data)),
  });
}

async function mockSession(page: Page, authenticated: boolean) {
  await page.route("**/api/auth/get-session", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(authenticated ? { user, session: { id: "e2e-session", expiresAt: "2099-01-01T00:00:00.000Z" } } : null),
    }),
  );
}

async function mockWorkspaceApi(page: Page) {
  await page.route("**/api/trpc/**", async route => {
    const path = new URL(route.request().url()).pathname.split("/api/trpc/")[1] ?? "";
    const paths = path.split(",");
    const responses = paths.map(name => {
      if (name === "projects.list") return projects;
      if (name === "dashboard.overview") return { projects, issues: [], pullRequests: [], deployments: [], incidents: [], automations: [], knowledge: [] };
      if (name === "integrations.githubStatus") return { connected: false, provider: null, accountLogin: null, lastSyncedAt: null, scopes: null, configured: true, demo: false };
      if (name === "account.me") return { id: user.id, name: user.name, email: user.email, demo: false };
      if (name.startsWith("projects.")) return projects[0];
      return [];
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(paths.length === 1 ? trpcEnvelope(responses[0]) : responses.map(response => trpcEnvelope(response))),
    });
  });
}

test.describe("CodeOps authentication browser flow", () => {
  test("redirects unauthenticated dashboard access to the secure sign-in boundary", async ({ page }) => {
    await mockSession(page, false);
    await page.goto("/dashboard");

    await expect(page.getByText("Workspace access / sign-in required")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in securely" })).toBeVisible();
    await expect(page.getByText("No localStorage access token or client credential is used.")).toBeVisible();
  });

  test("validates sign-up fields without submitting incomplete credentials", async ({ page }) => {
    await mockSession(page, false);
    await page.goto("/auth/sign-up");

    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await page.getByLabel("Your name").fill("E2E User");
    await page.getByLabel("Work email").fill("e2e@example.com");
    await page.getByPlaceholder("8+ characters").fill("password123");
    await page.getByPlaceholder("Repeat your password").fill("different123");
    await expect(page.getByText("Passwords do not match yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create workspace" })).toBeDisabled();
  });
});

test.describe("CodeOps project management browser flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, true);
    await mockWorkspaceApi(page);
    await page.goto("/dashboard/projects");
    await expect(page.getByRole("heading", { name: "Project graph" })).toBeVisible();
  });

  test("paginates projects and changes the page size", async ({ page }) => {
    await expect(page.getByText("Page 1 of 2 · 8 matching")).toBeVisible();
    await expect(page.getByTestId("project-select-8")).toBeVisible();
    await expect(page.getByTestId("project-select-2")).not.toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2 · 8 matching")).toBeVisible();
    await expect(page.getByTestId("project-select-2")).toBeVisible();
    await expect(page.getByTestId("project-select-8")).not.toBeVisible();

    await page.getByTestId("projects-page-size").selectOption("12");
    await expect(page.getByText("Page 1 of 1 · 8 matching")).toBeVisible();
    await expect(page.getByTestId("project-select-8")).toBeVisible();
  });

  test("selects visible projects, archives them, and confirms bulk deletion", async ({ page }) => {
    await page.getByTestId("project-select-8").check();
    await page.getByTestId("project-select-7").check();
    await expect(page.getByText("2 selected")).toBeVisible();

    await page.getByTestId("archive-selected-projects").click();
    await expect(page.getByRole("status").filter({ hasText: "2 projects archived." })).toBeVisible();

    await page.getByTestId("project-select-8").check();
    await page.getByTestId("project-select-7").check();
    await page.getByTestId("delete-selected-projects").click();
    await expect(page.getByRole("alertdialog")).toContainText("Delete 2 selected projects?");
    await page.getByRole("alertdialog").getByRole("button", { name: "Keep projects" }).click();
    await expect(page.getByRole("alertdialog")).not.toBeVisible();

    await page.getByTestId("delete-selected-projects").click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete selected" }).click();
    await expect(page.getByRole("status").filter({ hasText: "2 projects deleted." })).toBeVisible();
  });
});

