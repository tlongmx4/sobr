import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

const hoisted = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    token: {
      deleteMany: (...a: unknown[]) => hoisted.deleteMany(...a),
      create: (...a: unknown[]) => hoisted.create(...a),
      findUnique: (...a: unknown[]) => hoisted.findUnique(...a),
      update: (...a: unknown[]) => hoisted.update(...a),
    },
  },
}));

import { createToken, consumeToken, RESET_TTL_MS } from "@/lib/tokens";

const sha256 = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");

beforeEach(() => {
  for (const fn of Object.values(hoisted)) fn.mockReset();
});

describe("createToken", () => {
  it("invalidates prior unused tokens of the same type, then stores a hash (never the raw token)", async () => {
    hoisted.deleteMany.mockResolvedValue({ count: 1 });
    hoisted.create.mockResolvedValue({});

    const raw = await createToken({ userId: "u_1", type: "PASSWORD_RESET", ttlMs: RESET_TTL_MS });

    expect(hoisted.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u_1", type: "PASSWORD_RESET", usedAt: null },
    });

    const data = hoisted.create.mock.calls[0][0].data;
    expect(data.tokenHash).toBe(sha256(raw)); // stored value is the hash of the returned raw
    expect(data.tokenHash).not.toBe(raw); // raw is never persisted
    expect(data.userId).toBe("u_1");
    expect(data.type).toBe("PASSWORD_RESET");
    expect(typeof raw).toBe("string");
    expect(raw.length).toBeGreaterThan(0);
  });

  it("sets an expiry roughly ttlMs in the future", async () => {
    hoisted.deleteMany.mockResolvedValue({ count: 0 });
    hoisted.create.mockResolvedValue({});

    const before = Date.now();
    await createToken({ userId: "u_1", type: "PASSWORD_RESET", ttlMs: RESET_TTL_MS });
    const after = Date.now();

    const expiresAt = (hoisted.create.mock.calls[0][0].data.expiresAt as Date).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + RESET_TTL_MS);
    expect(expiresAt).toBeLessThanOrEqual(after + RESET_TTL_MS);
  });
});

describe("consumeToken", () => {
  const validRow = {
    id: "tok_1",
    userId: "u_1",
    type: "PASSWORD_RESET",
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };

  it("looks the token up by its sha256 hash, not the raw value", async () => {
    hoisted.findUnique.mockResolvedValue(validRow);
    hoisted.update.mockResolvedValue({});

    await consumeToken({ raw: "raw-token", type: "PASSWORD_RESET" });

    expect(hoisted.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: sha256("raw-token") },
    });
  });

  it("consumes a valid token: marks it used and returns the userId", async () => {
    hoisted.findUnique.mockResolvedValue(validRow);
    hoisted.update.mockResolvedValue({});

    const result = await consumeToken({ raw: "raw-token", type: "PASSWORD_RESET" });

    expect(result).toEqual({ userId: "u_1" });
    expect(hoisted.update).toHaveBeenCalledTimes(1);
    expect(hoisted.update.mock.calls[0][0]).toMatchObject({ where: { id: "tok_1" } });
    expect(hoisted.update.mock.calls[0][0].data.usedAt).toBeInstanceOf(Date);
  });

  it("returns null for an unknown token (and does not consume anything)", async () => {
    hoisted.findUnique.mockResolvedValue(null);
    expect(await consumeToken({ raw: "x", type: "PASSWORD_RESET" })).toBeNull();
    expect(hoisted.update).not.toHaveBeenCalled();
  });

  it("returns null when the token type does not match (can't reuse a verification token to reset a password)", async () => {
    hoisted.findUnique.mockResolvedValue({ ...validRow, type: "EMAIL_VERIFICATION" });
    expect(await consumeToken({ raw: "x", type: "PASSWORD_RESET" })).toBeNull();
    expect(hoisted.update).not.toHaveBeenCalled();
  });

  it("returns null for an already-used token (single use)", async () => {
    hoisted.findUnique.mockResolvedValue({ ...validRow, usedAt: new Date() });
    expect(await consumeToken({ raw: "x", type: "PASSWORD_RESET" })).toBeNull();
    expect(hoisted.update).not.toHaveBeenCalled();
  });

  it("returns null for an expired token", async () => {
    hoisted.findUnique.mockResolvedValue({ ...validRow, expiresAt: new Date(Date.now() - 1000) });
    expect(await consumeToken({ raw: "x", type: "PASSWORD_RESET" })).toBeNull();
    expect(hoisted.update).not.toHaveBeenCalled();
  });
});
