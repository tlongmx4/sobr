import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken, RESET_TTL_MS } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({ email: z.email() });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: true });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      name: true,
      preferredName: true,
      emailVerified: true,
    },
  });

  if (user && user.emailVerified) {
    try {
      const token = await createToken({
        userId: user.id,
        type: "PASSWORD_RESET",
        ttlMs: RESET_TTL_MS,
      });
      await sendPasswordResetEmail({
        to: user.email,
        name: user.preferredName || user.name,
        token,
      });
    } catch (error) {
      console.error("forgot password send failed", {
        name: error instanceof Error ? error.name : "Unknown",
      });
    }
  }

  return NextResponse.json({ success: true });
}
