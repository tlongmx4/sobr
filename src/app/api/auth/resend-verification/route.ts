import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken, VERIFICATION_TTL_MS } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { assertSameOrigin } from "@/lib/csrf";

const schema = z.object({ email: z.email() });

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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

  if (user && !user.emailVerified) {
    try {
      const token = await createToken({
        userId: user.id,
        type: "EMAIL_VERIFICATION",
        ttlMs: VERIFICATION_TTL_MS,
      });
      await sendVerificationEmail({
        to: user.email,
        name: user.preferredName || user.name,
        token,
      });
    } catch (error) {
      console.error("resend verification failed", {
        name: error instanceof Error ? error.name : "Unknown",
      });
    }
  }

  return NextResponse.json({ success: true });
}
