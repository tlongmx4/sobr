import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DISCLAIMER_VERSION } from "@/lib/onboarding";
import type { UIMessage } from "ai";
import { Dashboard } from "./Dashboard";

export default async function HomePage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [user, messages, todayCheckIn] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        preferredName: true,
        sobrietyStatus: true,
        sobrietyDate: true,
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
  ]);

  if (!user) redirect("/login");

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
      }}
      initialMessages={initialMessages}
      todayCheckIn={todayCheckIn}
      needsOnboarding={needsOnboarding}
    />
  );
}
