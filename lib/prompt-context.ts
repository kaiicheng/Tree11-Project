import type { InfluenceMetadata, ProjectMemory, TasteProfile } from "./taste-profiles";

const section = (label: string, entries: string[]) => entries.filter(Boolean).length ? `[${label}]\n${entries.filter(Boolean).join("\n")}` : "";
export function buildPromptContext(project: ProjectMemory, profile: TasteProfile | null) {
  const pinned = project.signals.filter(s => s.pinned && !s.rejected);
  const external = project.signals.filter(s => !s.pinned && !s.rejected);
  const profileParts = profile ? [
    profile.visualStyle && `Visual style / mood: ${profile.visualStyle}`, profile.composition && `Composition / camera: ${profile.composition}`,
    profile.colorLighting && `Color / lighting: ${profile.colorLighting}`, profile.brandVoice && `Brand voice: ${profile.brandVoice}`,
    profile.audience && `Audience: ${profile.audience}`, profile.constraints && `Recurring constraints: ${profile.constraints}`,
    profile.avoid && `Avoid: ${profile.avoid}`, profile.guidance && `Guidance: ${profile.guidance}`] : [];
  const prompt = [
    "Use the following labeled context. Priority is descending: project instructions override the taste profile; pinned research overrides general research; rejected research is excluded.",
    section("PROJECT INSTRUCTIONS — highest priority", [project.instructions]),
    section("SELECTED TASTE PROFILE — reusable preferences", profileParts),
    section("PINNED RESEARCH SIGNALS — higher research priority", pinned.map(s => `- ${s.text}`)),
    section("GENERAL RESEARCH — lower research priority", external.map(s => `- ${s.text}`))
  ].filter(Boolean).join("\n\n");
  const influence: InfluenceMetadata = { profile: profile ? { id: profile.id, name: profile.name, version: profile.version, updatedAt: profile.updatedAt } : null, usedSignalIds: [...pinned, ...external].map(s => s.id), promptVersion: 1 };
  return { prompt, influence };
}
