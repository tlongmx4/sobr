import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { chatModel } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/context";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

const MAX_USER_MESSAGE_LENGTH = 10000;

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

  await prisma.chatMessage.create({
    data: { userId, role: "USER", content: userText },
  });

  const systemPrompt = await buildSystemPrompt(userId);

  const result = streamText({
    model: chatModel,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      if (text.length > 0) {
        await prisma.chatMessage.create({
          data: { userId, role: "ASSISTANT", content: text },
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
