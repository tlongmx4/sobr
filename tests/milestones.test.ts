import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({
  findMany: vi.fn(),
  createMany: vi.fn(),
  executeRaw: vi.fn(),
}));

// Mock prisma: $transaction runs the callback with a tx that proxies to our
// spies, mirroring how the real client exposes earnedCoin + $executeRaw.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        $executeRaw: (...a: unknown[]) => hoisted.executeRaw(...a),
        earnedCoin: {
          findMany: (...a: unknown[]) => hoisted.findMany(...a),
          createMany: (...a: unknown[]) => hoisted.createMany(...a),
        },
      }),
  },
}));

import {
  MILESTONES,
  coinLabel,
  coinParts,
  recordMilestoneCoins,
} from "@/lib/milestones";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

beforeEach(() => {
  hoisted.findMany.mockReset().mockResolvedValue([]);
  hoisted.createMany.mockReset().mockResolvedValue({ count: 0 });
  hoisted.executeRaw.mockReset().mockResolvedValue(1);
});

describe("MILESTONES constant", () => {
  it("is strictly increasing by threshold", () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i].thresholdMs).toBeGreaterThan(
        MILESTONES[i - 1].thresholdMs,
      );
    }
  });

  it("starts at 24 hours and uses neutral labels (no program references)", () => {
    expect(MILESTONES[0]).toMatchObject({ id: "24h", thresholdMs: 24 * HOUR });
    const labels = MILESTONES.map((m) => m.label.toLowerCase()).join(" ");
    for (const banned of ["aa", "na", "step", "god", "higher power"]) {
      expect(labels).not.toContain(banned);
    }
  });

  it("coinLabel resolves ids and falls back to the raw id", () => {
    expect(coinLabel("30d")).toBe("30 days");
    expect(coinLabel("unknown")).toBe("unknown");
  });

  it("coinParts splits a label into value and unit for the coin face", () => {
    expect(coinParts("30d")).toEqual({ value: "30", unit: "days" });
    expect(coinParts("24h")).toEqual({ value: "24", unit: "hours" });
    expect(coinParts("1y")).toEqual({ value: "1", unit: "year" });
  });
});

describe("recordMilestoneCoins", () => {
  const now = new Date("2026-06-14T00:00:00.000Z");

  it("does nothing when sobrietyDate is null", async () => {
    await recordMilestoneCoins("u_1", null, now);
    expect(hoisted.findMany).not.toHaveBeenCalled();
    expect(hoisted.createMany).not.toHaveBeenCalled();
  });

  it("does nothing when no milestone has been crossed yet", async () => {
    // 1 hour in: not even the 24h coin is earned.
    const sobrietyDate = new Date(now.getTime() - HOUR);
    await recordMilestoneCoins("u_1", sobrietyDate, now);
    expect(hoisted.createMany).not.toHaveBeenCalled();
  });

  it("records crossed milestones with earnedAt = sobrietyDate + threshold", async () => {
    // 4 days in: 24h, 48h, 72h crossed (not 1 week).
    const sobrietyDate = new Date(now.getTime() - 4 * DAY);
    await recordMilestoneCoins("u_1", sobrietyDate, now);

    expect(hoisted.createMany).toHaveBeenCalledTimes(1);
    const { data } = hoisted.createMany.mock.calls[0][0];
    expect(data.map((d: { milestone: string }) => d.milestone)).toEqual([
      "24h",
      "48h",
      "72h",
    ]);
    const first = data[0];
    expect(first.userId).toBe("u_1");
    expect(first.earnedAt.getTime()).toBe(sobrietyDate.getTime() + 24 * HOUR);
  });

  it("skips milestones already recorded for this run (dedup)", async () => {
    const sobrietyDate = new Date(now.getTime() - 4 * DAY);
    // 24h and 48h already on record for this run.
    hoisted.findMany.mockResolvedValue([{ milestone: "24h" }, { milestone: "48h" }]);

    await recordMilestoneCoins("u_1", sobrietyDate, now);

    // Dedup read is scoped to this run only.
    expect(hoisted.findMany.mock.calls[0][0].where).toMatchObject({
      userId: "u_1",
      earnedAt: { gte: sobrietyDate },
    });
    const { data } = hoisted.createMany.mock.calls[0][0];
    expect(data.map((d: { milestone: string }) => d.milestone)).toEqual(["72h"]);
  });

  it("writes nothing when every crossed milestone is already recorded", async () => {
    const sobrietyDate = new Date(now.getTime() - 2 * DAY);
    hoisted.findMany.mockResolvedValue([
      { milestone: "24h" },
      { milestone: "48h" },
    ]);
    await recordMilestoneCoins("u_1", sobrietyDate, now);
    expect(hoisted.createMany).not.toHaveBeenCalled();
  });

  it("takes a per-user advisory lock before reading/writing", async () => {
    const sobrietyDate = new Date(now.getTime() - 2 * DAY);
    await recordMilestoneCoins("u_1", sobrietyDate, now);
    expect(hoisted.executeRaw).toHaveBeenCalledTimes(1);
  });
});
