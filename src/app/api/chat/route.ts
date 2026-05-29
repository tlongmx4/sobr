import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { chatModel } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/context";
import { classifyRisk } from "@/lib/safety/classifier";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

const MAX_USER_MESSAGE_LENGTH = 10000;
// Number of recent turns the crisis classifier sees, so it can read trajectory
// (compounding hopelessness, tone shift) and not just the latest message.
const CLASSIFIER_WINDOW = 6;

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Bad request", { status: 400 });
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return new Response("Bad request", { status: 400 });
  }

  const userText = extractText(last);
  if (userText.length === 0 || userText.length > MAX_USER_MESSAGE_LENGTH) {
    return new Response("Bad request", { status: 400 });
  }

  const userMessage = await prisma.chatMessage.create({
    data: { userId, role: "USER", content: userText },
  });

  // Run the lightweight crisis classifier in parallel with the conversational
  // model. Flag-and-log only: the verdict is persisted (HIGH/CRITICAL) but never
  // alters the stream. classifyRisk fails open, so this cannot break chat.
  const recentWindow = messages
    .slice(-CLASSIFIER_WINDOW)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "user" ? ("USER" as const) : ("ASSISTANT" as const),
      content: extractText(m),
    }))
    .filter((m) => m.content.length > 0);
  const verdictPromise = classifyRisk(recentWindow);

  const { stable, dynamic } = await buildSystemPrompt(userId);

  const result = streamText({
    model: chatModel,
    system: [
      {
        role: "system",
        content: stable,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      { role: "system", content: dynamic },
    ],
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      if (text.length > 0) {
        await prisma.chatMessage.create({
          data: { userId, role: "ASSISTANT", content: text },
        });
      }

      try {
        const verdict = await verdictPromise;
        if (verdict.severity === "HIGH" || verdict.severity === "CRITICAL") {
          await prisma.crisisFlag.create({
            data: {
              userId,
              messageId: userMessage.id,
              severity: verdict.severity,
              category: verdict.category,
              classifierConfidence: verdict.confidence,
              classifierModel: verdict.modelId,
            },
          });
        }
      } catch (error) {
        console.error("crisis flag write failed", {
          name: error instanceof Error ? error.name : "Unknown",
        });
      }
    },
    onError: ({ error }) => {
      console.error("chat stream failed", {
        name: error instanceof Error ? error.name : "Unknown",
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
