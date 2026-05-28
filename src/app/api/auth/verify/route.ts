import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";

const schema = z.object({ token: z.string().min(1) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await consumeToken({
    raw: parsed.data.token,
    type: "EMAIL_VERIFICATION",
  });
  if (!result) {
    return NextResponse.json(
      { error: "This link is invalid or has expired." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: result.userId },
    data: { emailVerified: new Date() },
  });

  return NextResponse.json({ success: true });
}
