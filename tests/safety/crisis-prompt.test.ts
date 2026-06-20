import { describe, it, expect, vi } from "vitest";

// buildSystemPrompt owns the crisis response: the conversational model surfaces
// resources from its calibrated system prompt (the classifier is flag-only and
// never touches the stream). These tests lock the resource text so an edit can't
// silently drop or corrupt a hotline number.

const hoisted = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: (...a: unknown[]) => hoisted.findUnique(...a) } },
}));

import { buildSystemPrompt } from "@/lib/context";

const baseUser = {
  id: "user_1",
  name: "Sam",
  preferredName: null,
  sobrietyDate: null,
  sobrietyStatus: "SOBER",
  frameworkPreference: "NEITHER",
  hobbies: [],
  substances: [],
  checkIns: [],
};

describe("crisis response — resources in the system prompt", () => {
  it("surfaces accurate crisis resources verbatim", async () => {
    hoisted.findUnique.mockResolvedValue(baseUser);
    const { stable } = await buildSystemPrompt("user_1");

    expect(stable).toContain("988"); // Suicide & Crisis Lifeline
    expect(stable).toContain("741741"); // Crisis Text Line
    expect(stable).toContain("HOME"); // text HOME to 741741
    expect(stable).toContain("1-800-662-4357"); // SAMHSA
    expect(stable).toContain("911"); // immediate danger
  });

  it("instructs calibrated, non-escalating crisis handling", async () => {
    hoisted.findUnique.mockResolvedValue(baseUser);
    const { stable } = await buildSystemPrompt("user_1");

    // The voice: ask one direct question when ambiguous, don't dump hotlines on venting.
    expect(stable.toLowerCase()).toContain("crisis");
    expect(stable.toLowerCase()).toMatch(/ambiguous|venting/);
    expect(stable.toLowerCase()).toContain("withdrawal"); // acute alcohol withdrawal as emergency
  });

  it("throws if the user is missing (no silent prompt with empty context)", async () => {
    hoisted.findUnique.mockResolvedValue(null);
    await expect(buildSystemPrompt("ghost")).rejects.toThrow();
  });
});

describe("role boundaries — sobr stays in its lane", () => {
  it("declines professional advice across medical, mental health, legal, and financial", async () => {
    hoisted.findUnique.mockResolvedValue(baseUser);
    const { stable } = await buildSystemPrompt("user_1");
    const lower = stable.toLowerCase();

    expect(lower).toContain("licensed professional"); // names the boundary
    expect(lower).toContain("therapist"); // mental health / clinical scope
    expect(lower).toContain("lawyer"); // legal handoff
    expect(lower).toContain("financial"); // financial handoff
  });

  it("names recovery-specific medication topics and hands off to a prescriber", async () => {
    hoisted.findUnique.mockResolvedValue(baseUser);
    const { stable } = await buildSystemPrompt("user_1");

    expect(stable).toContain("Suboxone"); // MAT named explicitly
    expect(stable).toContain("naltrexone");
    expect(stable.toLowerCase()).toContain("prescriber"); // route to the real thing
  });

  it("forbids false reassurance on physical symptoms", async () => {
    hoisted.findUnique.mockResolvedValue(baseUser);
    const { stable } = await buildSystemPrompt("user_1");
    const lower = stable.toLowerCase();

    // Never minimize: don't tell someone a symptom is "probably fine".
    expect(lower).toContain("nothing to worry about");
    expect(lower).toContain("have someone real look at that");
  });

  it("keeps boundaries subordinate to the crisis flow", async () => {
    hoisted.findUnique.mockResolvedValue(baseUser);
    const { stable } = await buildSystemPrompt("user_1");

    // The boundary section must yield to crisis, not deflect an emergency.
    expect(stable.toLowerCase()).toContain("overrides the crisis flow");
  });
});
