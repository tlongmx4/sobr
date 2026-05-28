import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
          <span className="font-heading text-lg font-semibold tracking-tight">
            Settings
          </span>
          <span className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <SettingsClient user={user} />
      </main>
    </div>
  );
}
