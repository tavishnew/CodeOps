import { boolean, datetime, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const betterAuthUser = mysqlTable("user", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: datetime("createdAt").notNull(),
  updatedAt: datetime("updatedAt").notNull(),
});

export const betterAuthSession = mysqlTable("session", {
  id: varchar("id", { length: 255 }).primaryKey(),
  expiresAt: datetime("expiresAt").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: datetime("createdAt").notNull(),
  updatedAt: datetime("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: varchar("userId", { length: 255 }).notNull(),
});

export const betterAuthAccount = mysqlTable("account", {
  id: varchar("id", { length: 255 }).primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: varchar("userId", { length: 255 }).notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: datetime("accessTokenExpiresAt"),
  refreshTokenExpiresAt: datetime("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: datetime("createdAt").notNull(),
  updatedAt: datetime("updatedAt").notNull(),
});

export const betterAuthVerification = mysqlTable("verification", {
  id: varchar("id", { length: 255 }).primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: datetime("expiresAt").notNull(),
  createdAt: datetime("createdAt"),
  updatedAt: datetime("updatedAt"),
});

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  mode: mysqlEnum("mode", ["preview", "connected"]).default("connected").notNull(),
  githubConnected: int("githubConnected").default(0).notNull(),
  githubProvider: varchar("githubProvider", { length: 40 }),
  githubAccountLogin: varchar("githubAccountLogin", { length: 180 }),
  githubLastSyncedAt: timestamp("githubLastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  repositoryUrl: varchar("repositoryUrl", { length: 500 }),
  status: mysqlEnum("status", ["on_track", "watch", "at_risk"]).default("on_track").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const issues = mysqlTable("issues", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  projectId: int("projectId").notNull(),
  key: varchar("key", { length: 40 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["open", "in_progress", "closed"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const pullRequests = mysqlTable("pull_requests", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  projectId: int("projectId").notNull(),
  number: int("number").notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  status: mysqlEnum("status", ["open", "merged", "closed"]).default("open").notNull(),
  risk: mysqlEnum("risk", ["low", "medium", "high"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const deployments = mysqlTable("deployments", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  projectId: int("projectId").notNull(),
  externalId: varchar("externalId", { length: 80 }).notNull(),
  environment: varchar("environment", { length: 40 }).notNull(),
  version: varchar("version", { length: 80 }).notNull(),
  commitSha: varchar("commitSha", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["successful", "watch", "failed"]).default("successful").notNull(),
  duration: varchar("duration", { length: 40 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const incidents = mysqlTable("incidents", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  projectId: int("projectId").notNull(),
  key: varchar("key", { length: 40 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description"),
  severity: mysqlEnum("severity", ["low", "medium", "high"]).default("medium").notNull(),
  status: mysqlEnum("status", ["investigating", "identified", "monitoring", "resolved"]).default("investigating").notNull(),
  service: varchar("service", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const automations = mysqlTable("automations", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  trigger: varchar("trigger", { length: 180 }).notNull(),
  actions: text("actions").notNull(),
  enabled: int("enabled").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const automationRuns = mysqlTable("automation_runs", {
  id: int("id").autoincrement().primaryKey(),
  automationId: int("automationId").notNull(),
  workspaceId: int("workspaceId").notNull(),
  status: mysqlEnum("status", ["queued", "running", "succeeded", "failed"]).default("queued").notNull(),
  result: text("result"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const knowledgeItems = mysqlTable("knowledge_items", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  projectId: int("projectId"),
  type: varchar("type", { length: 80 }).notNull(),
  label: varchar("label", { length: 180 }).notNull(),
  sourceRef: varchar("sourceRef", { length: 500 }),
  content: text("content"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const insights = mysqlTable("insights", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  projectId: int("projectId"),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description"),
  severity: mysqlEnum("severity", ["low", "medium", "high"]).default("medium").notNull(),
  confidence: varchar("confidence", { length: 40 }),
  sourceRef: varchar("sourceRef", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = typeof workspaces.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Issue = typeof issues.$inferSelect;
export type PullRequest = typeof pullRequests.$inferSelect;
export type Deployment = typeof deployments.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type Automation = typeof automations.$inferSelect;
export type AutomationRun = typeof automationRuns.$inferSelect;
export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type Insight = typeof insights.$inferSelect;
export type InsertInsight = typeof insights.$inferInsert;
