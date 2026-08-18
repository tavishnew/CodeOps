import { relations } from "drizzle-orm";
import { automations, automationRuns, deployments, incidents, issues, knowledgeItems, projects, pullRequests, users, workspaces } from "./schema";

export const workspaceRelations = relations(workspaces, ({ one, many }) => ({ owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }), projects: many(projects), issues: many(issues), pullRequests: many(pullRequests), deployments: many(deployments), incidents: many(incidents), automations: many(automations), knowledge: many(knowledgeItems) }));
export const projectRelations = relations(projects, ({ one, many }) => ({ workspace: one(workspaces, { fields: [projects.workspaceId], references: [workspaces.id] }), issues: many(issues), pullRequests: many(pullRequests), deployments: many(deployments), incidents: many(incidents), knowledge: many(knowledgeItems) }));
export const automationRelations = relations(automations, ({ one, many }) => ({ workspace: one(workspaces, { fields: [automations.workspaceId], references: [workspaces.id] }), runs: many(automationRuns) }));
export const automationRunRelations = relations(automationRuns, ({ one }) => ({ workspace: one(workspaces, { fields: [automationRuns.workspaceId], references: [workspaces.id] }), automation: one(automations, { fields: [automationRuns.automationId], references: [automations.id] }) }));
