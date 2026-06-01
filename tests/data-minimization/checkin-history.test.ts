import { describe, it, expect, vi, beforeEach } from "vitest";

// Locks the data-minimization guarantee for the dashboard heatmap: the check-in
// history query must select only mood/energy/craving/createdAt and NEVER the
// journalEntry (free text). We drive the real server-component function with a
// recording Prisma mock and inspect both the queries it issues and the props it
// hands to the client.

const SECRET_JOURNAL = "PRIVATE JOURNAL TEXT THAT MUST NEVER REACH THE CLIENT";

const hoisted = vi.hoisted(() => ({
  checkInCalls: [] as { where?: { userId?: string }; select?: Record<string, unknown> }[],
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUserId: async () => "u_1" }));
vi.mock("@/lib/onboarding", () => ({ DISCLAIMER_VERSION: 1 }));
vi.mock("./Dashboard", () => ({ Dashboard: () => null }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: async () => ({
        id: "u_1",
        name: "Sam",
        preferredName: null,
        sobrietyStatus: "SOBER",
        sobrietyDate: null,
        onboardingCompletedAt: new Date(),
        disclaimersVersion: 1,
      }),
    },
    chatMessage: { findMany: async () => [] },
    checkIn: {
      findFirst: async (args: (typeof hoisted.checkInCalls)[number]) => {
        hoisted.checkInCalls.push(args);
        return { moodRating: 3, energyRating: 3, cravingRating: null };
      },
      // Deliberately return rows that DO carry journal text, simulating a DB
      // that has the column. The page must not let it through regardless.
      findMany: async (args: (typeof hoisted.checkInCalls)[number]) => {
        hoisted.checkInCalls.push(args);
        return [
          {
            createdAt: new Date("2026-05-20T08:00:00.000Z"),
            moodRating: 5,
            energyRating: 5,
            cravingRating: 1,
            journalEntry: SECRET_JOURNAL,
          },
        ];
      },
    },
  },
}));

import HomePage from "@/app/(app)/page";

beforeEach(() => {
  hoisted.checkInCalls.length = 0;
});

describe("dashboard check-in history — data minimization", () => {
  it("never requests journalEntry in any check-in query", async () => {
    await HomePage();

    expect(hoisted.checkInCalls.length).toBeGreaterThan(0);
    for (const call of hoisted.checkInCalls) {
      expect(call.select).toBeDefined();
      // A narrow select is required, and it must not include the journal text.
      expect(call.select).not.toHaveProperty("journalEntry");
      // Only ratings + timestamp are ever selected.
      for (const key of Object.keys(call.select!)) {
        expect(["createdAt", "moodRating", "energyRating", "cravingRating"]).toContain(key);
      }
    }
  });

  it("scopes every check-in query to the current user", async () => {
    await HomePage();
    for (const call of hoisted.checkInCalls) {
      expect(call.where?.userId).toBe("u_1");
    }
  });

  it("hands the client zero journal text, even when the DB rows contain it", async () => {
    const element = await HomePage();
    // The server component returns <Dashboard ... />; inspect the props it passes.
    const props = (element as { props: Record<string, unknown> }).props;
    expect(JSON.stringify(props)).not.toContain(SECRET_JOURNAL);
    expect(JSON.stringify(props.history)).not.toContain(SECRET_JOURNAL);
    expect(JSON.stringify(props.todayCheckIn)).not.toContain(SECRET_JOURNAL);
  });

  it("still produces a usable history score from the allowed fields", async () => {
    const element = await HomePage();
    const props = (element as { props: { history: { date: string; score: number | null }[] } }).props;
    const day = props.history.find((d) => d.date === "2026-05-20");
    // mood 5, energy 5, craving 1 -> reversed (6-1)=5 -> mean 5.
    expect(day?.score).toBe(5);
  });
});
