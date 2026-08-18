import { automations, incident, insights, knowledge, projects, type Automation, type Insight, type KnowledgeItem, type Project } from "../../shared/codeopsData";

export type ProvenanceSource = { type: string; label: string; ref: string; confidence: number };
export type PreviewAiInsight = Insight & { provenance: ProvenanceSource[] };
export type PreviewWorkspace = { id: string; name: string; mode: "preview"; projects: Project[]; incidentId: string };

export function getPreviewWorkspace(): PreviewWorkspace {
  return { id: "workspace-preview", name: "Northstar engineering", mode: "preview", projects, incidentId: incident.id };
}

export function generatePreviewInsights(): PreviewAiInsight[] {
  return insights.map((item, index) => ({ ...item, provenance: [{ type: "repository", label: "auth/middleware.ts", ref: "8fa2c1", confidence: 0.82 - index * 0.05 }, { type: "incident", label: incident.id, ref: incident.title, confidence: 0.89 }] }));
}

export function getPreviewKnowledge(): { items: KnowledgeItem[]; provenance: ProvenanceSource[] } {
  return { items: knowledge, provenance: [{ type: "repository", label: "34 files", ref: "repo://preview", confidence: 1 }, { type: "runbook", label: "2 runbooks", ref: "runbook://preview", confidence: 0.88 }, { type: "deployment", label: "14 releases", ref: "deploy://preview", confidence: 0.91 }] };
}

export function getPreviewGithubBoundary() { return { provider: "github", connected: false as const, mode: "preview" as const, message: "GitHub connection is intentionally disconnected in this preview." }; }

export function simulateAutomation(name: string): { automation: Automation | undefined; executed: false; mode: "preview"; message: string } {
  const automation = automations.find(item => item.name === name);
  return { automation, executed: false, mode: "preview", message: "Automation execution is intentionally simulated; no external action was taken." };
}
