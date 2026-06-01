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
