import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    waitlist: { create: (...a: unknown[]) => hoisted.create(...a) },
    // The route runs a per-IP rate-limit check (shared RateLimit table) before
    // the insert. findUnique returns null so every test request starts a fresh
    // window (never limited); upsert/update are no-op stubs.
    rateLimit: {
      findUnique: () => Promise.resolve(null),
      upsert: () => Promise.resolve({}),
      update: () => Promise.resolve({}),
    },
  },
}));

import { POST } from "@/app/api/waitlist/route";

function waitlistReq(body: unknown) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { host: "localhost", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

// Mimics Prisma's unique-constraint error shape.
class P2002 extends Error {
  code = "P2002";
}

beforeEach(() => {
  hoisted.create.mockReset();
});

describe("waitlist submission", () => {
  it("stores a valid signup and returns 201 added", async () => {
    hoisted.create.mockResolvedValue({ id: "w_1" });
    const res = await POST(waitlistReq({ email: "sam@example.com", firstName: "Sam" }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ status: "added" });
    expect(hoisted.create).toHaveBeenCalledWith({
      data: { email: "sam@example.com", firstName: "Sam", note: undefined },
    });
  });

  it("lowercases the email so dedupe is case-insensitive", async () => {
    hoisted.create.mockResolvedValue({ id: "w_1" });
    await POST(waitlistReq({ email: "SaM@Example.COM" }));
    expect(hoisted.create.mock.calls[0][0].data.email).toBe("sam@example.com");
  });

  it("trims optional fields and drops empties to undefined", async () => {
    hoisted.create.mockResolvedValue({ id: "w_1" });
    await POST(waitlistReq({ email: "a@b.com", firstName: "  Jo  ", note: "  hi  " }));
    const data = hoisted.create.mock.calls[0][0].data;
    expect(data.firstName).toBe("Jo");
    expect(data.note).toBe("hi");
  });

  it("treats a duplicate email as success (idempotent, no leak) without erroring", async () => {
    hoisted.create.mockRejectedValue(new P2002("Unique constraint failed"));
    const res = await POST(waitlistReq({ email: "dupe@example.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "already" });
  });

  it("rejects an invalid email with 400 and never writes", async () => {
    const res = await POST(waitlistReq({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(hoisted.create).not.toHaveBeenCalled();
  });

  it("returns 500 on an unexpected DB error without leaking details", async () => {
    hoisted.create.mockRejectedValue(new Error("pg: connection refused"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(waitlistReq({ email: "a@b.com" }));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("connection refused");
    spy.mockRestore();
  });
});
