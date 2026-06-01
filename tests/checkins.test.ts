import { describe, it, expect } from "vitest";
import {
  dayScore,
  scoreToColor,
  bucketByDay,
  buildHistoryDays,
  historyWindowStart,
  GRID_SATURATION,
  GRID_LIGHTNESS,
  HISTORY_WEEKS,
  type CheckInPoint,
} from "@/lib/checkins";

describe("dayScore", () => {
  it("averages mood and energy when craving is absent", () => {
    expect(dayScore(3, 3, null)).toBe(3);
    expect(dayScore(4, 2, null)).toBe(3);
    expect(dayScore(5, 4, null)).toBe(4.5);
  });

  it("reverses craving as (6 - craving) before averaging", () => {
    // Low craving (1) is good -> reversed to 5.
    expect(dayScore(5, 5, 1)).toBe(5); // (5 + 5 + 5) / 3
    // High craving (5) is bad -> reversed to 1, dragging the mean down.
    expect(dayScore(5, 5, 5)).toBeCloseTo(11 / 3, 10); // (5 + 5 + 1) / 3
    // Mid craving (3) -> reversed to 3, neutral.
    expect(dayScore(3, 3, 3)).toBe(3);
  });

  it("divides by 3 only when craving is present, by 2 otherwise", () => {
    // Same mood/energy, craving present vs absent gives different denominators.
    expect(dayScore(4, 4, null)).toBe(4); // /2
    expect(dayScore(4, 4, 2)).toBe(4); // (4 + 4 + 4)/3 -> still 4 since 6-2=4
    expect(dayScore(4, 4, 4)).toBeCloseTo(10 / 3, 10); // (4 + 4 + 2)/3
  });

  it("stays within the 1-5 range at the extremes", () => {
    expect(dayScore(1, 1, 5)).toBe(1); // (1 + 1 + 1)/3
    expect(dayScore(5, 5, 1)).toBe(5);
  });
});

describe("scoreToColor", () => {
  it("maps the boundary scores 1, 3, 5 onto red, yellow, green hues", () => {
    expect(scoreToColor(1)).toBe(`hsl(0 ${GRID_SATURATION}% ${GRID_LIGHTNESS}%)`);
    expect(scoreToColor(3)).toBe(`hsl(60 ${GRID_SATURATION}% ${GRID_LIGHTNESS}%)`);
    expect(scoreToColor(5)).toBe(`hsl(120 ${GRID_SATURATION}% ${GRID_LIGHTNESS}%)`);
  });

  it("interpolates continuously between boundaries", () => {
    expect(scoreToColor(2)).toBe(`hsl(30 ${GRID_SATURATION}% ${GRID_LIGHTNESS}%)`);
    expect(scoreToColor(4)).toBe(`hsl(90 ${GRID_SATURATION}% ${GRID_LIGHTNESS}%)`);
  });

  it("clamps out-of-range scores to the gradient ends", () => {
    expect(scoreToColor(0)).toBe(`hsl(0 ${GRID_SATURATION}% ${GRID_LIGHTNESS}%)`);
    expect(scoreToColor(-10)).toBe(`hsl(0 ${GRID_SATURATION}% ${GRID_LIGHTNESS}%)`);
    expect(scoreToColor(6)).toBe(`hsl(120 ${GRID_SATURATION}% ${GRID_LIGHTNESS}%)`);
  });
});

describe("bucketByDay", () => {
  const point = (createdAt: string, mood: number, energy: number, craving: number | null): CheckInPoint => ({
    createdAt,
    moodRating: mood,
    energyRating: energy,
    cravingRating: craving,
  });

  it("returns an empty map for no points", () => {
    expect(bucketByDay([]).size).toBe(0);
  });

  it("keys by UTC date and carries the single day's score", () => {
    const map = bucketByDay([point("2026-05-20T08:00:00.000Z", 4, 4, null)]);
    expect(map.size).toBe(1);
    expect(map.get("2026-05-20")).toBe(4);
  });

  it("averages multiple check-ins on the same UTC day", () => {
    const map = bucketByDay([
      point("2026-05-20T08:00:00.000Z", 5, 5, null), // score 5
      point("2026-05-20T20:00:00.000Z", 1, 1, null), // score 1
    ]);
    expect(map.get("2026-05-20")).toBe(3); // (5 + 1) / 2
  });

  it("groups distinct days separately", () => {
    const map = bucketByDay([
      point("2026-05-20T08:00:00.000Z", 4, 4, null),
      point("2026-05-21T08:00:00.000Z", 2, 2, null),
    ]);
    expect(map.get("2026-05-20")).toBe(4);
    expect(map.get("2026-05-21")).toBe(2);
  });
});

describe("historyWindowStart", () => {
  it("returns a Sunday (UTC)", () => {
    const start = historyWindowStart(new Date("2026-05-31T12:00:00.000Z"));
    expect(start.getUTCDay()).toBe(0);
  });

  it("spans HISTORY_WEEKS of full weeks back from the current week", () => {
    const now = new Date("2026-05-31T12:00:00.000Z");
    const start = historyWindowStart(now);
    const today = new Date(Date.UTC(2026, 4, 31));
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setUTCDate(today.getUTCDate() - today.getUTCDay());
    const weeksBack = Math.round(
      (startOfThisWeek.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    expect(weeksBack).toBe(HISTORY_WEEKS - 1);
  });
});

describe("buildHistoryDays", () => {
  const now = new Date("2026-05-31T12:00:00.000Z");

  it("produces a whole number of weeks (Sunday-aligned grid)", () => {
    const days = buildHistoryDays([], now);
    expect(days.length % 7).toBe(0);
    expect(days[0].date).toBe(historyWindowStart(now).toISOString().slice(0, 10));
  });

  it("returns null (not a score) for days with no check-in", () => {
    const days = buildHistoryDays([], now);
    // Every non-future day with no data must be null, never a fabricated score.
    for (const d of days) {
      expect(d.score).toBeNull();
    }
  });

  it("attaches the bucketed score to the matching day", () => {
    const days = buildHistoryDays(
      [{ createdAt: "2026-05-20T08:00:00.000Z", moodRating: 5, energyRating: 5, cravingRating: 1 }],
      now,
    );
    const day = days.find((d) => d.date === "2026-05-20");
    expect(day?.score).toBe(5);
    expect(day?.future).toBe(false);
  });

  it("marks days after today as future with a null score", () => {
    const days = buildHistoryDays([], now);
    const future = days.filter((d) => d.future);
    for (const d of future) {
      expect(d.date > "2026-05-31").toBe(true);
      expect(d.score).toBeNull();
    }
  });

  it("never colors a future day even if (impossibly) data exists for it", () => {
    // Data dated in the future must not surface a score on a future cell.
    const days = buildHistoryDays(
      [{ createdAt: "2026-06-06T08:00:00.000Z", moodRating: 5, energyRating: 5, cravingRating: null }],
      now,
    );
    const futureDay = days.find((d) => d.date === "2026-06-06");
    if (futureDay?.future) {
      expect(futureDay.score).toBeNull();
    }
  });
});
