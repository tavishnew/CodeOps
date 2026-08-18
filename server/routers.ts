import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { getBetterAuth } from "./_core/betterAuth";
import { fromNodeHeaders } from "better-auth/node";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  archiveProject, connectGithubDemo, createIssue, createProject, deleteIssue, deleteProject, getAnalyticsForUser, getAutomation, getDashboardForUser, getDeployment, getGithubIntegration, getIncident, getIssue, getKnowledgeItem, getProject, getPullRequest, getWorkspaceForUser, listAutomations, listDeployments, listGithubRepositories, listIncidents, listIssues, listKnowledge, listProjects, listPullRequests, runAutomation, setAutomationEnabled, syncGithubDemo, updateIncident, updateIssue, updateProject,
} from "./db";

const idInput = z.object({ id: z.number().int().positive() });
const projectInput = z.object({ name: z.string().trim().min(2).max(180), description: z.string().max(2000).optional(), repositoryUrl: z.string().url().optional() });
const issueInput = z.object({ projectId: z.number().int().positive(), key: z.string().trim().min(2).max(40), title: z.string().trim().min(2).max(240), description: z.string().max(2000).optional(), priority: z.enum(["low", "medium", "high"]).optional() });
const ensure = <T>(value: T | undefined, label: string) => { if (!value) throw new TRPCError({ code: "NOT_FOUND", message: `${label} was not found in this workspace.` }); return value; };
const detail = <T>(loader: (userId: number, id: number) => Promise<T | undefined>, label: string) => protectedProcedure.input(idInput).query(async ({ ctx, input }) => ensure(await loader(ctx.user.id, input.id), label));

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(async ({ ctx }) => { try { await getBetterAuth().api.signOut({ headers: fromNodeHeaders(ctx.req.headers) }); } catch {} const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
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
  integrations: router({
    githubStatus: protectedProcedure.query(({ ctx }) => getGithubIntegration(ctx.user.id)),
    githubRepositories: protectedProcedure.query(({ ctx }) => listGithubRepositories(ctx.user.id)),
    connectGithub: protectedProcedure.mutation(async ({ ctx }) => { const result = await connectGithubDemo(ctx.user.id); return { ...result, message: result.message }; }),
    syncGithub: protectedProcedure.input(z.object({ repositoryNames: z.array(z.string().trim().min(1)).min(1).max(10) })).mutation(async ({ ctx, input }) => syncGithubDemo(ctx.user.id, input.repositoryNames)),
  }),
});

export type AppRouter = typeof appRouter;
