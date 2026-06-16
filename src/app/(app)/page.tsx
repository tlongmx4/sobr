import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DISCLAIMER_VERSION } from "@/lib/onboarding";
import { buildHistoryDays, historyWindowStart } from "@/lib/checkins";
import { currentMilestone, recordMilestoneCoins } from "@/lib/milestones";
import type { UIMessage } from "ai";
import { Dashboard } from "./Dashboard";

export default async function HomePage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const historyStart = historyWindowStart(now);

  const [user, messages, todayCheckIn, historyPoints] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        preferredName: true,
        sobrietyStatus: true,
        sobrietyDate: true,
        showMilestones: true,
        onboardingCompletedAt: true,
        disclaimersVersion: true,
      },
    }),
    prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.checkIn.findFirst({
      where: { userId, createdAt: { gte: startOfToday } },
      select: { moodRating: true, energyRating: true, cravingRating: true },
    }),
    // History window for the heatmap. Narrow select on purpose: no journalEntry
    // (or any text) is sent to the client.
    prisma.checkIn.findMany({
      where: { userId, createdAt: { gte: historyStart } },
      select: {
        createdAt: true,
        moodRating: true,
        energyRating: true,
        cravingRating: true,
      },
    }),
  ]);

  if (!user) redirect("/login");

  // Record any milestones crossed in the current run. Runs regardless of
  // showMilestones (that toggle only gates display), and is a no-op when
  // sobrietyDate is null or the run's coins already exist.
  await recordMilestoneCoins(userId, user.sobrietyDate, now);

  // Highest milestone for the current sobrietyDate, for the dashboard chip.
  // Computed directly from the date (not from earned coins) so it always tracks
  // the current run and can't get stuck on a coin left over from a date reset.
  const latestCoin = currentMilestone(user.sobrietyDate, now);

  const history = buildHistoryDays(
    historyPoints.map((p) => ({
      createdAt: p.createdAt.toISOString(),
      moodRating: p.moodRating,
      energyRating: p.energyRating,
      cravingRating: p.cravingRating,
    })),
    now,
  );

  const needsOnboarding =
    !user.onboardingCompletedAt ||
    user.disclaimersVersion < DISCLAIMER_VERSION;

  const initialMessages: UIMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role === "USER" ? "user" : "assistant",
    parts: [{ type: "text", text: m.content }],
  }));

  return (
    <Dashboard
      user={{
        id: user.id,
        name: user.name,
        preferredName: user.preferredName,
        sobrietyStatus: user.sobrietyStatus,
        sobrietyDate: user.sobrietyDate
          ? user.sobrietyDate.toISOString()
          : null,
        showMilestones: user.showMilestones,
      }}
      latestCoin={
        latestCoin
          ? {
              milestone: latestCoin.milestone,
              earnedAt: latestCoin.earnedAt.toISOString(),
            }
          : null
      }
      initialMessages={initialMessages}
      todayCheckIn={todayCheckIn}
      needsOnboarding={needsOnboarding}
      history={history}
    />
  );
}
