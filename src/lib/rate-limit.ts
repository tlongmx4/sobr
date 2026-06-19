import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

// Single backend-agnostic rate limiter. Endpoints import `checkRateLimit` only;
// the storage backend (currently a Postgres fixed-window counter via the
// `RateLimit` model) lives entirely behind this module, so it can be swapped for
// Redis later without touching any caller.

export type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds: number;
};

export type RateLimitOptions = {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests permitted per key per window. */
  max: number;
};

/**
 * Fixed-window check-and-increment. Returns `limited: true` once a key exceeds
 * `max` within the current window; the window resets after `windowMs`.
 */
export async function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = new Date();
  const existing = await prisma.rateLimit.findUnique({ where: { key } });

  // No window yet, or the previous one has elapsed: start a fresh window.
  if (
    !existing ||
    now.getTime() - existing.windowStart.getTime() > opts.windowMs
  ) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return { limited: false, retryAfterSeconds: 0 };
  }

  const windowEnds = existing.windowStart.getTime() + opts.windowMs;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowEnds - now.getTime()) / 1000),
  );

  if (existing.count >= opts.max) {
    return { limited: true, retryAfterSeconds };
  }

  await prisma.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
  return { limited: false, retryAfterSeconds };
}

/** Best-effort client IP from proxy headers. Falls back to "unknown". */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Salted hash of an identifier (IP, email) so no raw PII is ever persisted in a
 * rate-limit key. Reuses JWT_SECRET as the salt to avoid adding a new env var;
 * JWT_SECRET is always present in any environment that can serve auth.
 */
export function hashIdentifier(value: string): string {
  return createHash("sha256")
    .update(`${process.env.JWT_SECRET ?? ""}:${value}`)
    .digest("hex");
}
