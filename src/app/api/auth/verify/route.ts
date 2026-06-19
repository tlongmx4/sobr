import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";
import { assertSameOrigin } from "@/lib/csrf";
import { checkRateLimit, getClientIp, hashIdentifier } from "@/lib/rate-limit";

const schema = z.object({ token: z.string().min(1) });

// Throttle token-consumption attempts per IP. Verification tokens are 256-bit so
// brute force is already infeasible; this caps abuse and accidental hammering.
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_MAX = 10;

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const key = `verify:${hashIdentifier(getClientIp(request))}`;
  const { limited, retryAfterSeconds } = await checkRateLimit(key, {
    windowMs: RATE_WINDOW_MS,
    max: RATE_MAX,
  });
  if (limited) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

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
