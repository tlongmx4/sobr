// Check-in history scoring + color helpers for the dashboard heatmap.
//
// Each rating is 1-5. Cravings are reversed (high craving is bad), so a day's
// score is the mean of the present ratings, always in the range 1-5. The score
// maps to a continuous red -> yellow -> green HSL gradient. Days with no check-in
// are never colored on the gradient (see the grid component): no data != bad day.

// Gradient tuning. Kept muted to sit well against the cream/clay theme.
// Bump SATURATION toward 60 for more vivid cells, or LIGHTNESS down for deeper tones.
export const GRID_SATURATION = 50; // %
export const GRID_LIGHTNESS = 58; // %

// How many weeks of history the grid shows (~4 months).
export const HISTORY_WEEKS = 17;

export type CheckInPoint = {
  createdAt: string; // ISO string (UTC)
  moodRating: number;
  energyRating: number;
  cravingRating: number | null;
};

export type HistoryDay = {
  date: string; // YYYY-MM-DD (UTC)
  score: number | null; // null = no check-in that day
  future: boolean; // date after today (padding for the current week)
};

// Average of the present ratings (mood + energy are always present; craving is
// reversed and optional). Range 1-5.
export function dayScore(
  mood: number,
  energy: number,
  craving: number | null,
): number {
  const parts = [mood, energy];
  if (craving != null) parts.push(6 - craving);
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

// Continuous gradient: score 1 -> hue 0 (red), 5 -> hue 120 (green).
export function scoreToColor(score: number): string {
  const normalized = Math.min(1, Math.max(0, (score - 1) / 4));
  const hue = normalized * 120;
  return `hsl(${hue} ${GRID_SATURATION}% ${GRID_LIGHTNESS}%)`;
}

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Group check-ins by UTC date, averaging the per-check-in day score for days
// with more than one check-in.
export function bucketByDay(points: CheckInPoint[]): Map<string, number> {
  const groups = new Map<string, number[]>();
  for (const p of points) {
    const key = p.createdAt.slice(0, 10); // ISO string is already UTC
    const score = dayScore(p.moodRating, p.energyRating, p.cravingRating);
    const arr = groups.get(key);
    if (arr) arr.push(score);
    else groups.set(key, [score]);
  }

  const out = new Map<string, number>();
  for (const [key, scores] of groups) {
    out.set(key, scores.reduce((a, b) => a + b, 0) / scores.length);
  }
  return out;
}

// The Sunday that begins the visible window: the start of the week
// (HISTORY_WEEKS - 1) weeks before the current week. Used for the DB query bound.
export function historyWindowStart(now: Date): Date {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = new Date(today);
  start.setUTCDate(
    start.getUTCDate() - today.getUTCDay() - (HISTORY_WEEKS - 1) * 7,
  );
  return start;
}

// Build the ordered list of days for the grid: full Sunday-to-Saturday weeks
// from historyWindowStart through the end of the current week. Days after today
// are marked `future` so the current week's tail renders blank.
export function buildHistoryDays(
  points: CheckInPoint[],
  now: Date,
): HistoryDay[] {
  const scores = bucketByDay(points);
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const todayKey = utcDateKey(today);
  const start = historyWindowStart(now);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + (6 - today.getUTCDay())); // Saturday of this week

  const days: HistoryDay[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = utcDateKey(d);
    const future = key > todayKey;
    days.push({
      date: key,
      score: future ? null : (scores.get(key) ?? null),
      future,
    });
  }
  return days;
}
