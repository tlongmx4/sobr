import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => hoisted.findUnique(...a),
      update: (...a: unknown[]) => hoisted.update(...a),
    },
  },
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUserId: (...a: unknown[]) => hoisted.getCurrentUserId(...a),
}));
vi.mock("bcryptjs", () => ({
  default: {
    compare: (...a: unknown[]) => hoisted.compare(...a),
    hash: (...a: unknown[]) => hoisted.hash(...a),
  },
}));
// Imported at the top of the route but unused by PATCH — stub so import is clean.
vi.mock("@/lib/tokens", () => ({ createToken: vi.fn(), VERIFICATION_TTL_MS: 0 }));
vi.mock("@/lib/email", () => ({ sendVerificationEmail: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ delete: vi.fn() }) }));

import { PATCH } from "@/app/api/users/route";

const USER_ID = "u_1";

function patchReq(body: unknown) {
  return new Request("http://localhost/api/users", {
    method: "PATCH",
    headers: { host: "localhost", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  for (const fn of Object.values(hoisted)) fn.mockReset();
  hoisted.getCurrentUserId.mockResolvedValue(USER_ID);
  hoisted.findUnique.mockResolvedValue({ passwordHash: "stored-hash" });
  hoisted.update.mockResolvedValue({ id: USER_ID });
  hoisted.hash.mockResolvedValue("new-hash");
});

describe("PATCH /api/users — CSRF guard", () => {
  it("rejects a cross-origin request with 403 before any work", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/users", {
        method: "PATCH",
        headers: { host: "localhost", origin: "https://evil.com" },
        body: JSON.stringify({ preferredName: "Sam" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(hoisted.getCurrentUserId).not.toHaveBeenCalled();
    expect(hoisted.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/users — auth gate", () => {
  it("returns 401 when there is no session", async () => {
    hoisted.getCurrentUserId.mockResolvedValue(null);
    const res = await PATCH(patchReq({ preferredName: "Sam" }));
    expect(res.status).toBe(401);
    expect(hoisted.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/users — re-auth on sensitive fields", () => {
  it("blocks a password change with 400 when currentPassword is missing", async () => {
    const res = await PATCH(patchReq({ password: "newpassword1" }));
    expect(res.status).toBe(400);
    expect(hoisted.compare).not.toHaveBeenCalled();
    expect(hoisted.update).not.toHaveBeenCalled();
  });

  it("blocks an email change with 400 when currentPassword is missing", async () => {
    const res = await PATCH(patchReq({ email: "new@example.com" }));
    expect(res.status).toBe(400);
    expect(hoisted.update).not.toHaveBeenCalled();
  });

  it("returns 403 when currentPassword is wrong", async () => {
    hoisted.compare.mockResolvedValue(false);
    const res = await PATCH(
      patchReq({ password: "newpassword1", currentPassword: "wrong" }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Current password is incorrect.");
    expect(hoisted.compare).toHaveBeenCalledWith("wrong", "stored-hash");
    expect(hoisted.update).not.toHaveBeenCalled();
  });

  it("changes the password with 200 when currentPassword is correct", async () => {
    hoisted.compare.mockResolvedValue(true);
    const res = await PATCH(
      patchReq({ password: "newpassword1", currentPassword: "right" }),
    );
    expect(res.status).toBe(200);
    expect(hoisted.update).toHaveBeenCalledTimes(1);
    const updateArg = hoisted.update.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data.passwordHash).toBe("new-hash");
    // currentPassword and the raw password must never reach the DB payload.
    expect(updateArg.data).not.toHaveProperty("currentPassword");
    expect(updateArg.data).not.toHaveProperty("password");
  });
});

describe("PATCH /api/users — non-sensitive fields", () => {
  it("updates a profile field with 200 without requiring currentPassword", async () => {
    const res = await PATCH(patchReq({ preferredName: "Sam" }));
    expect(res.status).toBe(200);
    expect(hoisted.compare).not.toHaveBeenCalled();
    expect(hoisted.findUnique).not.toHaveBeenCalled();
    expect(hoisted.update).toHaveBeenCalledTimes(1);
  });
});
