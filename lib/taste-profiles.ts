export const PROFILE_STORE_VERSION = 1;
export const PROFILE_STORAGE_KEY = "research-signal.taste-profiles.v1";
export const PROJECT_STORAGE_KEY = "research-signal.projects.v1";

export type TasteProfile = {
  id: string; version: number; name: string; createdAt: string; updatedAt: string;
  visualStyle: string; composition: string; colorLighting: string; brandVoice: string;
  audience: string; constraints: string; avoid: string; guidance: string;
};
export type ResearchSignal = { id: string; text: string; source?: string; pinned?: boolean; rejected?: boolean };
export type ProjectMemory = {
  id: string; title: string; instructions: string; activeProfileId: string | null;
  signals: ResearchSignal[]; updatedAt: string;
};
export type InfluenceMetadata = { profile: Pick<TasteProfile, "id" | "name" | "version" | "updatedAt"> | null; usedSignalIds: string[]; promptVersion: 1 };

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const id = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const now = () => new Date().toISOString();

export function createTasteProfile(values: Partial<TasteProfile> = {}): TasteProfile {
  const timestamp = now();
  return { id: values.id || id(), version: Number.isInteger(values.version) ? values.version! : 1,
    name: text(values.name) || "Untitled profile", createdAt: text(values.createdAt) || timestamp, updatedAt: text(values.updatedAt) || timestamp,
    visualStyle: text(values.visualStyle), composition: text(values.composition), colorLighting: text(values.colorLighting),
    brandVoice: text(values.brandVoice), audience: text(values.audience), constraints: text(values.constraints), avoid: text(values.avoid), guidance: text(values.guidance) };
}
export function parseProfiles(raw: string | null): TasteProfile[] {
  try { const parsed = JSON.parse(raw || "[]"); const list = Array.isArray(parsed) ? parsed : parsed.profiles;
    return Array.isArray(list) ? list.filter(x => x && typeof x === "object" && text(x.id)).map(x => createTasteProfile(x)) : [];
  } catch { return []; }
}
export function serializeProfiles(profiles: TasteProfile[]) { return JSON.stringify({ schemaVersion: PROFILE_STORE_VERSION, profiles }); }
export function recoverProject(project: Partial<ProjectMemory>, profiles: TasteProfile[]): ProjectMemory {
  return { id: text(project.id) || id(), title: text(project.title) || "Untitled project", instructions: text(project.instructions),
    activeProfileId: profiles.some(p => p.id === project.activeProfileId) ? project.activeProfileId! : null,
    signals: Array.isArray(project.signals) ? project.signals.filter(s => s && text(s.id) && text(s.text)).map(s => ({ id: text(s.id), text: text(s.text), source: text(s.source), pinned: !!s.pinned, rejected: !!s.rejected })) : [],
    updatedAt: text(project.updatedAt) || now() };
}
export function parseProjects(raw: string | null, profiles: TasteProfile[]): ProjectMemory[] {
  try { const parsed = JSON.parse(raw || "[]"); const list = Array.isArray(parsed) ? parsed : parsed.projects; return Array.isArray(list) ? list.map(p => recoverProject(p, profiles)) : []; } catch { return []; }
}
