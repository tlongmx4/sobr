import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  compare: vi.fn(),
  cookieSet: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => hoisted.findUnique(...a),
      update: (...a: unknown[]) => hoisted.update(...a),
    },
  },
}));
vi.mock("bcryptjs", () => ({
  default: { compare: (...a: unknown[]) => hoisted.compare(...a) },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: (...a: unknown[]) => hoisted.cookieSet(...a) }),
}));

import { POST } from "@/app/api/auth/login/route";

const MAX_FAILED_ATTEMPTS = 5;

function loginReq(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const verifiedUser = {
  id: "u_1",
  email: "sam@example.com",
  passwordHash: "hashed",
  name: "Sam",
  username: "sam",
  emailVerified: new Date(),
  failedLoginAttempts: 0,
  lockedUntil: null as Date | null,
};

beforeEach(() => {
  for (const fn of Object.values(hoisted)) fn.mockReset();
  hoisted.update.mockResolvedValue({});
});

describe("login — input + lookup", () => {
  it("returns 400 when email or password is missing", async () => {
    expect((await POST(loginReq({ email: "a@b.com" }))).status).toBe(400);
    expect((await POST(loginReq({ password: "x" }))).status).toBe(400);
  });

  it("returns a generic 401 for an unknown email (no user enumeration)", async () => {
    hoisted.findUnique.mockResolvedValue(null);
    const res = await POST(loginReq({ email: "nope@b.com", password: "x" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Invalid email or password");
    expect(hoisted.compare).not.toHaveBeenCalled();
  });
});

describe("login — lockout / rate limiting", () => {
  it("short-circuits with 429 + Retry-After when the account is already locked", async () => {
    hoisted.findUnique.mockResolvedValue({
      ...verifiedUser,
      lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
    });

    const res = await POST(loginReq({ email: verifiedUser.email, password: "whatever" }));

    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("LOCKED");
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(hoisted.compare).not.toHaveBeenCalled(); // doesn't even check the password
  });

  it("increments the failure counter on a wrong password below the threshold", async () => {
    hoisted.findUnique.mockResolvedValue({ ...verifiedUser, failedLoginAttempts: 1 });
    hoisted.compare.mockResolvedValue(false);

    const res = await POST(loginReq({ email: verifiedUser.email, password: "wrong" }));

    expect(res.status).toBe(401);
    expect(hoisted.update).toHaveBeenCalledWith({
      where: { id: "u_1" },
      data: { failedLoginAttempts: 2 },
    });
  });

  it("locks the account on the Nth consecutive failure", async () => {
    hoisted.findUnique.mockResolvedValue({
      ...verifiedUser,
      failedLoginAttempts: MAX_FAILED_ATTEMPTS - 1,
    });
    hoisted.compare.mockResolvedValue(false);

    const res = await POST(loginReq({ email: verifiedUser.email, password: "wrong" }));

    expect(res.status).toBe(429);
    const data = hoisted.update.mock.calls[0][0].data;
    expect(data.failedLoginAttempts).toBe(0); // counter reset...
    expect(data.lockedUntil).toBeInstanceOf(Date); // ...and a lock applied
    expect(data.lockedUntil.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("login — verification + success", () => {
  it("blocks an unverified email with 403 even when the password is right", async () => {
    hoisted.findUnique.mockResolvedValue({ ...verifiedUser, emailVerified: null });
    hoisted.compare.mockResolvedValue(true);

    const res = await POST(loginReq({ email: verifiedUser.email, password: "correct" }));

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("EMAIL_NOT_VERIFIED");
    expect(hoisted.cookieSet).not.toHaveBeenCalled();
  });

  it("signs an HttpOnly token cookie and returns the user on success", async () => {
    hoisted.findUnique.mockResolvedValue({ ...verifiedUser });
    hoisted.compare.mockResolvedValue(true);

    const res = await POST(loginReq({ email: verifiedUser.email, password: "correct" }));

    expect(res.status).toBe(200);
    expect((await res.json()).user).toMatchObject({ id: "u_1", email: verifiedUser.email });

    expect(hoisted.cookieSet).toHaveBeenCalledTimes(1);
    const [name, token, opts] = hoisted.cookieSet.mock.calls[0];
    expect(name).toBe("token");
    expect(typeof token).toBe("string");
    expect(opts).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("clears a stale failure counter on a successful login", async () => {
    hoisted.findUnique.mockResolvedValue({ ...verifiedUser, failedLoginAttempts: 3 });
    hoisted.compare.mockResolvedValue(true);

    await POST(loginReq({ email: verifiedUser.email, password: "correct" }));

    expect(hoisted.update).toHaveBeenCalledWith({
      where: { id: "u_1" },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });
});
