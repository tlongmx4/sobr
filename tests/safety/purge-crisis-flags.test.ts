import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({ deleteMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { crisisFlag: { deleteMany: (...a: unknown[]) => hoisted.deleteMany(...a) } },
}));

import { GET } from "@/app/api/cron/purge-crisis-flags/route";

const RETENTION_DAYS = 14;

function req(authHeader?: string) {
  return new Request("http://localhost/api/cron/purge-crisis-flags", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

beforeEach(() => {
  hoisted.deleteMany.mockReset().mockResolvedValue({ count: 0 });
  process.env.CRON_SECRET = "test-cron-secret";
});

describe("purge-crisis-flags cron — auth", () => {
  it("returns 500 and does not purge when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
    expect(hoisted.deleteMany).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token is missing", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(hoisted.deleteMany).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const res = await GET(req("Bearer not-the-secret"));
    expect(res.status).toBe(401);
    expect(hoisted.deleteMany).not.toHaveBeenCalled();
  });
});

describe("purge-crisis-flags cron — retention logic", () => {
  it("deletes flags older than the 14-day cutoff and reports the count", async () => {
    hoisted.deleteMany.mockResolvedValue({ count: 7 });

    const before = Date.now();
    const res = await GET(req("Bearer test-cron-secret"));
    const after = Date.now();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ purged: 7 });

    expect(hoisted.deleteMany).toHaveBeenCalledTimes(1);
    const where = hoisted.deleteMany.mock.calls[0][0].where;

    // It filters on createdAt < (now - 14 days), and on nothing else (purges
    // regardless of `reviewed`, per the privacy posture).
    expect(Object.keys(where)).toEqual(["createdAt"]);
    expect(Object.keys(where.createdAt)).toEqual(["lt"]);

    const cutoff = (where.createdAt.lt as Date).getTime();
    const expectedLow = before - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const expectedHigh = after - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    expect(cutoff).toBeGreaterThanOrEqual(expectedLow);
    expect(cutoff).toBeLessThanOrEqual(expectedHigh);
  });

  it("returns 500 (not a stack trace) when the delete fails", async () => {
    hoisted.deleteMany.mockRejectedValue(new Error("connection reset"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(req("Bearer test-cron-secret"));

    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("connection reset");
    spy.mockRestore();
  });
});
