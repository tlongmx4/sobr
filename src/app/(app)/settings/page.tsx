import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      preferredName: true,
      username: true,
      email: true,
      showMilestones: true,
      sobrietyDate: true,
    },
  });

  if (!user) redirect("/login");

  // Serialize the date to YYYY-MM-DD so it round-trips cleanly through the
  // <input type="date"> and back to the PATCH endpoint (which coerces the same
  // UTC-midnight value onboarding stores).
  const clientUser = {
    ...user,
    sobrietyDate: user.sobrietyDate
      ? user.sobrietyDate.toISOString().slice(0, 10)
      : null,
  };

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader href="/" />

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <div className="mt-8">
          <SettingsClient user={clientUser} />
        </div>
      </main>
    </div>
  );
}
