import { describe, it, expect, vi, beforeEach } from "vitest";

// Drives the real chat POST handler with every external boundary mocked, so we
// can assert exactly what gets written to the CrisisFlag table. The point of
// these tests: a flag is written only for HIGH/CRITICAL, and it carries metadata
// only — never the user's message content.

const hoisted = vi.hoisted(() => ({
  // streamText is mocked to capture its options so the test can invoke onFinish
  // (the SDK normally calls it after the stream completes).
  capturedOpts: null as { onFinish?: (a: { text: string }) => Promise<void> } | null,
  verdict: { severity: "NONE", category: "OTHER", modelId: "claude-haiku-4-5", confidence: undefined } as {
    severity: string;
    category: string;
    modelId: string;
    confidence?: number;
  },
  userId: "user_1" as string | null,
  chatMessageCreate: vi.fn(),
  crisisFlagCreate: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: (opts: typeof hoisted.capturedOpts) => {
    hoisted.capturedOpts = opts;
    return { toUIMessageStreamResponse: () => new Response("stream", { status: 200 }) };
  },
  convertToModelMessages: async (m: unknown) => m,
}));
vi.mock("@/lib/ai", () => ({ chatModel: {}, classifierModel: {} }));
vi.mock("@/lib/context", () => ({
  buildSystemPrompt: async () => ({ stable: "stable prompt", dynamic: "dynamic prompt" }),
}));
vi.mock("@/lib/safety/classifier", () => ({
  classifyRisk: async () => hoisted.verdict,
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUserId: async () => hoisted.userId,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatMessage: { create: (...a: unknown[]) => hoisted.chatMessageCreate(...a) },
    crisisFlag: { create: (...a: unknown[]) => hoisted.crisisFlagCreate(...a) },
  },
}));

import { POST } from "@/app/api/chat/route";

const SECRET_TEXT = "I have the pills and I'm in the car tonight";

function makeReq(text: string) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: [{ role: "user", parts: [{ type: "text", text }] }],
    }),
  });
}

// The exact set of columns the route is allowed to write. Anything outside this
// set — especially message content — is a data-minimization regression.
const ALLOWED_FLAG_FIELDS = [
  "userId",
  "messageId",
  "severity",
  "category",
  "classifierConfidence",
  "classifierModel",
];

beforeEach(() => {
  hoisted.capturedOpts = null;
  hoisted.userId = "user_1";
  hoisted.verdict = { severity: "NONE", category: "OTHER", modelId: "claude-haiku-4-5" };
  hoisted.chatMessageCreate.mockReset().mockResolvedValue({ id: "msg_1" });
  hoisted.crisisFlagCreate.mockReset().mockResolvedValue({});
});

describe("chat route — CrisisFlag write", () => {
  it("rejects unauthenticated requests before touching the DB", async () => {
    hoisted.userId = null;
    const res = await POST(makeReq(SECRET_TEXT));
    expect(res.status).toBe(401);
    expect(hoisted.chatMessageCreate).not.toHaveBeenCalled();
  });

  it("writes a flag for a CRITICAL verdict with metadata only — no message content", async () => {
    hoisted.verdict = {
      severity: "CRITICAL",
      category: "SUICIDAL_IDEATION",
      confidence: 0.95,
      modelId: "claude-haiku-4-5",
    };

    const res = await POST(makeReq(SECRET_TEXT));
    expect(res.status).toBe(200);

    // Simulate the SDK finishing the stream.
    await hoisted.capturedOpts!.onFinish!({ text: "I hear you. **988** — call or text." });

    expect(hoisted.crisisFlagCreate).toHaveBeenCalledTimes(1);
    const data = hoisted.crisisFlagCreate.mock.calls[0][0].data;

    // It references the message by id, never copies the text.
    expect(data).toMatchObject({
      userId: "user_1",
      messageId: "msg_1",
      severity: "CRITICAL",
      category: "SUICIDAL_IDEATION",
      classifierConfidence: 0.95,
      classifierModel: "claude-haiku-4-5",
    });

    // No field outside the metadata allow-list, and the content never leaks.
    for (const key of Object.keys(data)) {
      expect(ALLOWED_FLAG_FIELDS).toContain(key);
    }
    expect(JSON.stringify(data)).not.toContain("pills");
    expect(JSON.stringify(data)).not.toContain("988"); // not even the assistant reply
  });

  it("writes a flag for a HIGH verdict", async () => {
    hoisted.verdict = { severity: "HIGH", category: "SELF_HARM", modelId: "claude-haiku-4-5" };
    await POST(makeReq(SECRET_TEXT));
    await hoisted.capturedOpts!.onFinish!({ text: "reply" });
    expect(hoisted.crisisFlagCreate).toHaveBeenCalledTimes(1);
    expect(hoisted.crisisFlagCreate.mock.calls[0][0].data.severity).toBe("HIGH");
  });

  it.each(["NONE", "LOW", "MEDIUM"])(
    "does NOT write a flag for a %s verdict",
    async (severity) => {
      hoisted.verdict = { severity, category: "OTHER", modelId: "claude-haiku-4-5" };
      await POST(makeReq("today was rough but I'm okay"));
      await hoisted.capturedOpts!.onFinish!({ text: "glad you're hanging in" });
      expect(hoisted.crisisFlagCreate).not.toHaveBeenCalled();
    },
  );

  it("persists the user message content (that table does store content, by design)", async () => {
    await POST(makeReq(SECRET_TEXT));
    expect(hoisted.chatMessageCreate).toHaveBeenCalledWith({
      data: { userId: "user_1", role: "USER", content: SECRET_TEXT },
    });
  });

  it("a classifier/flag write failure never throws out of onFinish (chat keeps working)", async () => {
    hoisted.verdict = { severity: "CRITICAL", category: "OTHER", modelId: "claude-haiku-4-5" };
    hoisted.crisisFlagCreate.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await POST(makeReq(SECRET_TEXT));
    await expect(
      hoisted.capturedOpts!.onFinish!({ text: "reply" }),
    ).resolves.not.toThrow();

    spy.mockRestore();
  });
});
