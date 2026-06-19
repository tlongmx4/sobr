import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken, RESET_TTL_MS } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { assertSameOrigin } from "@/lib/csrf";
import { checkRateLimit, getClientIp, hashIdentifier } from "@/lib/rate-limit";

const schema = z.object({ email: z.email() });

// Throttle reset-email requests so the endpoint can't be used to spam a victim's
// inbox or enumerate accounts at scale. Keyed on IP + target email.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 5;

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: true });
  }

  const key = `forgot-password:${hashIdentifier(
    `${getClientIp(request)}:${parsed.data.email.toLowerCase()}`,
  )}`;
  const { limited, retryAfterSeconds } = await checkRateLimit(key, {
    windowMs: RATE_WINDOW_MS,
    max: RATE_MAX,
  });
  if (limited) {
    // Stay neutral: same shape as success so this can't be used to probe.
    return NextResponse.json(
      { success: true },
      { headers: { "Retry-After": String(retryAfterSeconds) } },
    );
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
