import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  archiveProject, createInsight, createIssue, createProject, deleteInsight, deleteIssue, deleteProject, getAnalyticsForUser, getAutomation, getDashboardForUser, getDeployment, getGithubIntegration, getIncident, getInsight, getIssue, getKnowledgeItem, getProject, getPullRequest, getWorkspaceForUser, listAutomations, listDeployments, listIncidents, listInsights, listIssues, listKnowledge, listProjects, listPullRequests, runAutomation, setAutomationEnabled, updateIncident, updateInsight, updateIssue, updateProject,
} from "./db";
import { disconnectUserGitHub, githubConnectUrl, syncUserGitHub } from "./githubService";

const idInput = z.object({ id: z.number().int().positive() });
const projectInput = z.object({ name: z.string().trim().min(2).max(180), description: z.string().max(2000).optional(), repositoryUrl: z.string().url().optional() });
const issueInput = z.object({ projectId: z.number().int().positive(), key: z.string().trim().min(2).max(40), title: z.string().trim().min(2).max(240), description: z.string().max(2000).optional(), priority: z.enum(["low", "medium", "high"]).optional() });
const insightInput = z.object({ projectId: z.number().int().positive().optional(), title: z.string().trim().min(2).max(240), description: z.string().max(2000).optional(), severity: z.enum(["low", "medium", "high"]).optional(), confidence: z.string().max(40).optional(), sourceRef: z.string().max(500).optional() });
const ensure = <T>(value: T | undefined, label: string) => { if (!value) throw new TRPCError({ code: "NOT_FOUND", message: `${label} was not found in this workspace.` }); return value; };
const detail = <T>(loader: (userId: number, id: number) => Promise<T | undefined>, label: string) => protectedProcedure.input(idInput).query(async ({ ctx, input }) => ensure(await loader(ctx.user.id, input.id), label));

export const appRouter = router({
  workspace: router({ current: protectedProcedure.query(({ ctx }) => getWorkspaceForUser(ctx.user.id, ctx.user.name)) }),
  dashboard: router({ overview: protectedProcedure.query(({ ctx }) => getDashboardForUser(ctx.user.id, ctx.user.name)) }),
  analytics: router({ overview: protectedProcedure.query(({ ctx }) => getAnalyticsForUser(ctx.user.id)) }),
  projects: router({ list: protectedProcedure.query(({ ctx }) => listProjects(ctx.user.id)), get: detail(getProject, "Project"), create: protectedProcedure.input(projectInput).mutation(({ ctx, input }) => createProject(ctx.user.id, input)), update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: projectInput.partial().extend({ status: z.enum(["on_track", "watch", "at_risk"]).optional() }) })).mutation(async ({ ctx, input }) => ensure(await updateProject(ctx.user.id, input.id, input.data), "Project")), archive: protectedProcedure.input(idInput).mutation(({ ctx, input }) => archiveProject(ctx.user.id, input.id)), delete: protectedProcedure.input(idInput).mutation(({ ctx, input }) => deleteProject(ctx.user.id, input.id)) }),
  issues: router({ list: protectedProcedure.query(({ ctx }) => listIssues(ctx.user.id)), get: detail(getIssue, "Issue"), create: protectedProcedure.input(issueInput).mutation(({ ctx, input }) => createIssue(ctx.user.id, input)), update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: z.object({ title: z.string().trim().min(2).max(240).optional(), description: z.string().max(2000).optional(), status: z.enum(["open", "in_progress", "closed"]).optional(), priority: z.enum(["low", "medium", "high"]).optional() }) })).mutation(async ({ ctx, input }) => ensure(await updateIssue(ctx.user.id, input.id, input.data), "Issue")), delete: protectedProcedure.input(idInput).mutation(({ ctx, input }) => deleteIssue(ctx.user.id, input.id)) }),
  pullRequests: router({ list: protectedProcedure.query(({ ctx }) => listPullRequests(ctx.user.id)), get: detail(getPullRequest, "Pull request") }),
  deployments: router({ list: protectedProcedure.query(({ ctx }) => listDeployments(ctx.user.id)), get: detail(getDeployment, "Deployment") }),
  incidents: router({ list: protectedProcedure.query(({ ctx }) => listIncidents(ctx.user.id)), get: detail(getIncident, "Incident"), updateStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["investigating", "identified", "monitoring", "resolved"]) })).mutation(async ({ ctx, input }) => ensure(await updateIncident(ctx.user.id, input.id, input.status), "Incident")) }),
  automations: router({ list: protectedProcedure.query(({ ctx }) => listAutomations(ctx.user.id)), get: detail(getAutomation, "Automation"), setEnabled: protectedProcedure.input(z.object({ id: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => ensure(await setAutomationEnabled(ctx.user.id, input.id, input.enabled), "Automation")), run: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => ensure(await runAutomation(ctx.user.id, input.id), "Automation")) }),
  knowledge: router({ list: protectedProcedure.query(({ ctx }) => listKnowledge(ctx.user.id)), get: detail(getKnowledgeItem, "Knowledge item") }),
  insights: router({ list: protectedProcedure.query(({ ctx }) => listInsights(ctx.user.id)), get: detail(getInsight, "Insight"), create: protectedProcedure.input(insightInput).mutation(({ ctx, input }) => createInsight(ctx.user.id, input)), update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: insightInput.partial() })).mutation(async ({ ctx, input }) => ensure(await updateInsight(ctx.user.id, input.id, input.data), "Insight")), delete: protectedProcedure.input(idInput).mutation(({ ctx, input }) => deleteInsight(ctx.user.id, input.id)) }),
  integrations: router({
    githubStatus: protectedProcedure.query(async ({ ctx }) => ({ ...(await getGithubIntegration(ctx.user.id)), connectUrl: githubConnectUrl() })),
    syncGithub: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.demo) throw new TRPCError({ code: "FORBIDDEN", message: "Demo accounts show seeded walkthrough data and cannot sync a GitHub account." });
      const result = await syncUserGitHub(ctx.user.id);
      return { ...result, message: "GitHub data refreshed — repositories, issues, and pull requests were pulled from your account." };
    }),
    disconnectGithub: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.demo) throw new TRPCError({ code: "FORBIDDEN", message: "Demo accounts have no GitHub connection to remove." });
      return disconnectUserGitHub(ctx.user.id);
    }),
  }),
  account: router({
    me: protectedProcedure.query(({ ctx }) => ({ id: ctx.user.id, name: ctx.user.name, email: ctx.user.email, demo: Boolean(ctx.user.demo) })),
  }),
});

export type AppRouter = typeof appRouter;
