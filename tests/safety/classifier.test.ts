import { describe, it, expect, vi, beforeEach } from "vitest";

// The classifier calls generateObject() from the `ai` SDK. We mock that single
// boundary so the tests are deterministic and never hit the network: every test
// drives the wrapper logic (verdict mapping, fail-open) without a real model.
const generateObject = vi.fn();
vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => generateObject(...args),
}));

import { classifyRisk } from "@/lib/safety/classifier";

const window = [
  { role: "USER" as const, content: "I'm in the car and I have the pills" },
];

beforeEach(() => {
  generateObject.mockReset();
});

describe("classifyRisk — verdict mapping", () => {
  it("maps a CRITICAL model verdict through to the structured result", async () => {
    generateObject.mockResolvedValue({
      object: {
        severity: "CRITICAL",
        category: "SUICIDAL_IDEATION",
        confidence: 0.93,
      },
      response: { modelId: "claude-haiku-4-5-20251001" },
    });

    const verdict = await classifyRisk(window);

    expect(verdict.severity).toBe("CRITICAL");
    expect(verdict.category).toBe("SUICIDAL_IDEATION");
    expect(verdict.confidence).toBe(0.93);
    expect(verdict.modelId).toBe("claude-haiku-4-5-20251001");
  });

  it("returns a NONE verdict for benign venting without flagging", async () => {
    generateObject.mockResolvedValue({
      object: { severity: "NONE", category: "OTHER", confidence: 0.4 },
      response: { modelId: "claude-haiku-4-5" },
    });

    const verdict = await classifyRisk([
      { role: "USER", content: "ugh I want to die, today was the worst" },
    ]);

    expect(verdict.severity).toBe("NONE");
  });

  it("falls back to a default modelId when the response omits one", async () => {
    generateObject.mockResolvedValue({
      object: { severity: "LOW", category: "SEVERE_DISTRESS" },
      response: {},
    });

    const verdict = await classifyRisk(window);

    expect(verdict.modelId).toBe("claude-haiku-4-5");
    expect(verdict.confidence).toBeUndefined();
  });

  it("runs the classifier at temperature 0 for stable labels", async () => {
    generateObject.mockResolvedValue({
      object: { severity: "NONE", category: "OTHER" },
      response: { modelId: "claude-haiku-4-5" },
    });

    await classifyRisk(window);

    expect(generateObject).toHaveBeenCalledTimes(1);
    expect(generateObject.mock.calls[0][0]).toMatchObject({ temperature: 0 });
  });
});

describe("classifyRisk — fails open", () => {
  it("returns severity NONE (no flag) when the model call throws, and never rethrows", async () => {
    generateObject.mockRejectedValue(new Error("upstream 503"));

    const verdict = await classifyRisk(window);

    expect(verdict.severity).toBe("NONE");
    expect(verdict.category).toBe("OTHER");
    expect(verdict.modelId).toBe("claude-haiku-4-5");
  });

  it("logs only a sanitized error name — never the conversation content", async () => {
    const err = new Error(window[0].content); // message text smuggled into the error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    generateObject.mockRejectedValue(err);

    await classifyRisk(window);

    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain("Error"); // the sanitized name
    expect(logged).not.toContain("the pills"); // never the message body
    spy.mockRestore();
  });
});
