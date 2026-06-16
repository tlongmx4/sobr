import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { MILESTONES } from "@/lib/milestones";
import { Coin } from "@/components/coin";
import { Card, CardContent } from "@/components/ui/card";

// Ordering index so the collection reads as a timeline (24 hours first, years
// last). Unknown ids (milestones removed from MILESTONES) sort to the end.
const ORDER = new Map(MILESTONES.map((m, i) => [m.id, i]));

export default async function CoinsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  // Every coin ever earned, surviving resets. We never delete past coins.
  const coins = await prisma.earnedCoin.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
    select: { milestone: true, earnedAt: true },
  });

  // Collapse to one chip per milestone with a count, so re-earning across runs
  // reads as resilience rather than clutter.
  const byMilestone = new Map<string, { count: number; latest: Date }>();
  for (const c of coins) {
    const entry = byMilestone.get(c.milestone);
    if (entry) {
      entry.count += 1;
      if (c.earnedAt > entry.latest) entry.latest = c.earnedAt;
    } else {
      byMilestone.set(c.milestone, { count: 1, latest: c.earnedAt });
    }
  }

  const groups = [...byMilestone.entries()]
    .map(([milestone, { count, latest }]) => ({ milestone, count, latest }))
    .sort(
      (a, b) =>
        (ORDER.get(a.milestone) ?? Number.MAX_SAFE_INTEGER) -
        (ORDER.get(b.milestone) ?? Number.MAX_SAFE_INTEGER),
    );

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader href="/" />

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Milestones
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every milestone you have reached. These stay with you, even through a
          reset. Each one was earned.
        </p>

        <div className="mt-8">
          {groups.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Sparkles className="mx-auto size-5 text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Your milestones will show up here as you go. The first one is
                  24 hours.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4">
              {groups.map((g) => (
                <li
                  key={g.milestone}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <Coin milestone={g.milestone} />
                  {g.count > 1 && (
                    <span className="text-xs text-muted-foreground">
                      earned {g.count}&times;
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
