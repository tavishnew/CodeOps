export type StatusTone = "moss" | "saffron" | "brick";
export type DashboardSection = "Overview" | "Projects" | "Issues" | "Pull Requests" | "Deployments" | "Incidents" | "Automations" | "Knowledge" | "Analytics" | "Settings";

export type Project = { name: string; status: string; tone: StatusTone; issues: number; prs: number; deploy: string; risk: string; description: string };
export type Incident = { id: string; title: string; severity: string; status: string; service: string; project: string; issue: string; pr: string; deployment: string; commit: string; description: string };
export type Deployment = { id: string; project: string; environment: string; version: string; commit: string; pr: string; status: string; duration: string; timestamp: string };
export type Automation = { name: string; trigger: string; status: string; lastRun: string; result: string; actions: string[] };
export type Insight = { title: string; meta: string; description: string; severity: string; confidence: string };
export type KnowledgeItem = { type: string; label: string; count: string };

export const projects: Project[] = [
  { name: "Axiom", status: "On track", tone: "moss", issues: 8, prs: 4, deploy: "2.4.0", risk: "Low", description: "Authorization surface with a stable release thread." },
  { name: "AutoQA", status: "Watch", tone: "saffron", issues: 13, prs: 3, deploy: "1.8.2", risk: "Medium", description: "Test automation with a retry-regression signal to inspect." },
  { name: "Notely", status: "On track", tone: "moss", issues: 5, prs: 2, deploy: "0.9.7", risk: "Low", description: "Notes and context capture with quiet delivery health." },
  { name: "SignalDock", status: "At risk", tone: "brick", issues: 21, prs: 6, deploy: "3.1.0", risk: "High", description: "Event routing where incident context needs attention." },
];

export const incident: Incident = { id: "INC-042", title: "API request failures", severity: "High", status: "Investigating", service: "API gateway", project: "Axiom", issue: "AX-318", pr: "PR #142", deployment: "DEPLOY 2.4.0", commit: "8fa2c1", description: "Request failures appeared after an authentication middleware change. This preview investigation is assembling evidence from repository history and runbooks." };

export const deployments: Deployment[] = [
  { id: "DEP-208", project: "Axiom", environment: "production", version: "2.4.0", commit: "8fa2c1", pr: "PR #142", status: "Successful", duration: "04m 12s", timestamp: "12 min ago" },
  { id: "DEP-207", project: "AutoQA", environment: "staging", version: "1.8.2", commit: "3d91a4", pr: "PR #87", status: "Watch", duration: "06m 44s", timestamp: "2 hr ago" },
];

export const automations: Automation[] = [
  { name: "PR risk review", trigger: "Pull request opened", status: "Preview ready", lastRun: "38 min ago", result: "Draft insight created", actions: ["AI review", "risk assessment", "notify team"] },
  { name: "Failed deploy investigation", trigger: "Deployment failed", status: "Coming later", lastRun: "Not connected", result: "Safe mock only", actions: ["investigate", "create incident", "notify team"] },
  { name: "Stale issue watch", trigger: "Issue inactive", status: "Coming later", lastRun: "Not connected", result: "Safe mock only", actions: ["detect blocker", "notify assignee"] },
  { name: "Production error report", trigger: "Production error", status: "Coming later", lastRun: "Not connected", result: "Safe mock only", actions: ["investigate", "generate incident report"] },
];

export const insights: Insight[] = [
  { title: "Elevated deployment risk", meta: "Axiom · PR #142", description: "High-risk auth change follows three related issues.", severity: "High", confidence: "0.82 preview" },
  { title: "Regression pattern detected", meta: "AutoQA · last 24h", description: "Test flake clusters around request retries.", severity: "Medium", confidence: "0.71 preview" },
  { title: "Knowledge context ready", meta: "SignalDock · 8 sources", description: "Runbook and incident precedent are indexed.", severity: "Low", confidence: "0.89 preview" },
];

export const knowledge: KnowledgeItem[] = [
  { type: "Repository files", label: "repository", count: "34" },
  { type: "Issues", label: "issue", count: "8" },
  { type: "Pull requests", label: "pr", count: "3" },
  { type: "Runbooks", label: "runbook", count: "2" },
  { type: "Deployments", label: "deploy", count: "14" },
  { type: "Incidents", label: "incident", count: "1" },
];

export const activity = [
  { title: "Deploy 2.4.0", meta: "Axiom / production", time: "12 min ago", tone: "moss" as StatusTone },
  { title: "PR #142 opened", meta: "auth/middleware.ts", time: "38 min ago", tone: "saffron" as StatusTone },
  { title: "Knowledge sync", meta: "34 files · 8 issues", time: "1 hr ago", tone: "moss" as StatusTone },
];
