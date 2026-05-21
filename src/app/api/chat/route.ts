import { NextRequest } from "next/server";
import { anthropic, MODEL } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/context";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ message: z.string().min(1).max(10000) });

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return new Response("Unauthorized", { status: 401 });

  const decoded = verifyToken(token);
  if (!decoded) return new Response("Invalid token", { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const userId = decoded.userId;
  const { message } = parsed.data;

  await prisma.chatMessage.create({
    data: { userId, role: "USER", content: message },
  });

  const history = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const messages = history.reverse().map((m) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const systemPrompt = await buildSystemPrompt(userId);

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  let fullResponse = "";
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }
        await prisma.chatMessage.create({
          data: { userId, role: "ASSISTANT", content: fullResponse },
        });
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}