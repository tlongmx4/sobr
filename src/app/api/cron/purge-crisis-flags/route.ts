import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Retention window for crisis flags. Flags are deliberately ephemeral: this runs
// daily (GitHub Actions) and deletes anything older than the window, regardless of
// `reviewed`, in line with the privacy-forward posture on the privacy page.
const RETENTION_DAYS = 14;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("purge-crisis-flags: CRON_SECRET not configured");
    return new Response("Server misconfigured", { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const { count } = await prisma.crisisFlag.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return Response.json({ purged: count });
  } catch (error) {
    console.error("purge-crisis-flags failed", {
      name: error instanceof Error ? error.name : "Unknown",
    });
    return new Response("Purge failed", { status: 500 });
  }
}
