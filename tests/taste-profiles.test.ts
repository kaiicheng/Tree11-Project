import assert from "node:assert/strict";
import test from "node:test";
import { buildPromptContext } from "../lib/prompt-context";
import { createTasteProfile, parseProfiles, parseProjects, recoverProject, serializeProfiles } from "../lib/taste-profiles";

test("profile serialization tolerates malformed storage and round-trips contracts", () => {
  const profile = createTasteProfile({ id: "warm", name: "Warm editorial", visualStyle: "grain" });
  assert.deepEqual(parseProfiles("not json"), []);
  const parsed = parseProfiles(serializeProfiles([profile]));
  assert.equal(parsed[0].id, "warm"); assert.equal(parsed[0].visualStyle, "grain"); assert.equal(parsed[0].version, 1);
});
test("deleted or stale profile references recover to no active profile", () => {
  const recovered = recoverProject({ id: "p", activeProfileId: "gone", signals: [] }, []);
  assert.equal(recovered.activeProfileId, null);
  assert.equal(parseProjects("{bad", []).length, 0);
});
test("project instructions precede profile, pinned research, then general research", () => {
  const profile = createTasteProfile({ id: "profile", name: "Film", visualStyle: "soft film" });
  const project = recoverProject({ id: "p", instructions: "Use a square crop", activeProfileId: "profile", signals: [
    { id: "pin", text: "Audience prefers clarity", pinned: true }, { id: "general", text: "Seasonal trend", pinned: false }
  ] }, [profile]);
  const prompt = buildPromptContext(project, profile).prompt;
  assert.ok(prompt.indexOf("square crop") < prompt.indexOf("soft film"));
  assert.ok(prompt.indexOf("soft film") < prompt.indexOf("Audience prefers clarity"));
  assert.ok(prompt.indexOf("Audience prefers clarity") < prompt.indexOf("Seasonal trend"));
});
test("rejected signals never leak into prompt or influence metadata", () => {
  const project = recoverProject({ id: "p", signals: [{ id: "no", text: "Do not include", rejected: true }, { id: "yes", text: "Include", pinned: true }] }, []);
  const context = buildPromptContext(project, null);
  assert.ok(!context.prompt.includes("Do not include")); assert.deepEqual(context.influence.usedSignalIds, ["yes"]);
});
