import { prisma } from "@/lib/prisma";

// Sobriety milestone definitions. Neutral time labels only: no program
// references (AA/NA/steps) anywhere. Each coin is earned once the elapsed time
// since the user's current sobrietyDate reaches `thresholdMs`.
//
// Months and years use fixed day counts (month = 30 days, year = 365 days) so
// the thresholds are predictable and strictly increasing. They're approximate
// by design; this is a companion app, not a clock.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export type Milestone = {
  id: string;
  label: string;
  thresholdMs: number;
};

// Yearly tail (3 years onward). "Every year after" is open-ended, so we
// generate up to a generous cap rather than hand-listing each one.
const MAX_YEAR = 30;

function yearlyTail(): Milestone[] {
  const years: Milestone[] = [];
  for (let y = 3; y <= MAX_YEAR; y++) {
    years.push({ id: `${y}y`, label: `${y} years`, thresholdMs: y * YEAR });
  }
  return years;
}

// Single source of truth, ordered by threshold ascending. Easy to extend: add
// an entry (or bump MAX_YEAR) and both the dashboard and /coins pick it up.
export const MILESTONES: Milestone[] = [
  { id: "24h", label: "24 hours", thresholdMs: 24 * HOUR },
  { id: "48h", label: "48 hours", thresholdMs: 48 * HOUR },
  { id: "72h", label: "72 hours", thresholdMs: 72 * HOUR },
  { id: "1w", label: "1 week", thresholdMs: WEEK },
  { id: "2w", label: "2 weeks", thresholdMs: 2 * WEEK },
  { id: "30d", label: "30 days", thresholdMs: 30 * DAY },
  { id: "60d", label: "60 days", thresholdMs: 60 * DAY },
  { id: "90d", label: "90 days", thresholdMs: 90 * DAY },
  { id: "6mo", label: "6 months", thresholdMs: 6 * MONTH },
  { id: "9mo", label: "9 months", thresholdMs: 9 * MONTH },
  { id: "1y", label: "1 year", thresholdMs: YEAR },
  { id: "18mo", label: "18 months", thresholdMs: 18 * MONTH },
  { id: "2y", label: "2 years", thresholdMs: 2 * YEAR },
  ...yearlyTail(),
];

const LABEL_BY_ID = new Map(MILESTONES.map((m) => [m.id, m.label]));

// Human label for a stored milestone id. Falls back to the raw id if an old
// row references a milestone that's since been removed from MILESTONES.
export function coinLabel(id: string): string {
  return LABEL_BY_ID.get(id) ?? id;
}

// Records any milestones crossed in the CURRENT run that aren't already on
// record for this run. Idempotent per run: re-running does nothing once the
// run's coins exist. Safe to call on every dashboard load.
//
// "This run" = EarnedCoin rows with earnedAt >= the current sobrietyDate. A
// milestone can be re-earned in a future run (after a reset) because the dedup
// is scoped by earnedAt, and past coins are never deleted.
//
// Fails gracefully on a null sobrietyDate (no coins, no crash).
export async function recordMilestoneCoins(
  userId: string,
  sobrietyDate: Date | null,
  now: Date,
): Promise<void> {
  if (!sobrietyDate) return;

  const elapsed = now.getTime() - sobrietyDate.getTime();
  const crossed = MILESTONES.filter((m) => elapsed >= m.thresholdMs);
  if (crossed.length === 0) return;

  const crossedIds = crossed.map((m) => m.id);

  // Serialize per-user so two concurrent dashboard loads (e.g. two tabs) can't
  // both pass the dedup read and double-insert the same coin. There's no unique
  // constraint to lean on (re-earning across runs is allowed), so we take a
  // per-user advisory lock for the duration of the transaction.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

    const existing = await tx.earnedCoin.findMany({
      where: {
        userId,
        earnedAt: { gte: sobrietyDate },
        milestone: { in: crossedIds },
      },
      select: { milestone: true },
    });
    const have = new Set(existing.map((e) => e.milestone));

    const toCreate = crossed
      .filter((m) => !have.has(m.id))
      .map((m) => ({
        userId,
        milestone: m.id,
        // The true moment the threshold was crossed (always >= sobrietyDate),
        // not "now", so the timeline reads accurately.
        earnedAt: new Date(sobrietyDate.getTime() + m.thresholdMs),
      }));

    if (toCreate.length > 0) {
      await tx.earnedCoin.createMany({ data: toCreate });
    }
  });
}
