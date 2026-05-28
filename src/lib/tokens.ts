import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { TokenType } from "@prisma/client";

const TOKEN_BYTES = 32;
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const RESET_TTL_MS = 60 * 60 * 1000; // 1h

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createToken(opts: {
  userId: string;
  type: TokenType;
  ttlMs: number;
}): Promise<string> {
  const raw = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + opts.ttlMs);

  await prisma.token.deleteMany({
    where: { userId: opts.userId, type: opts.type, usedAt: null },
  });

  await prisma.token.create({
    data: {
      userId: opts.userId,
      tokenHash,
      type: opts.type,
      expiresAt,
    },
  });

  return raw;
}

export async function consumeToken(opts: {
  raw: string;
  type: TokenType;
}): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(opts.raw);
  const token = await prisma.token.findUnique({ where: { tokenHash } });
  if (!token) return null;
  if (token.type !== opts.type) return null;
  if (token.usedAt) return null;
  if (token.expiresAt < new Date()) return null;

  await prisma.token.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });

  return { userId: token.userId };
}
