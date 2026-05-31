import { SiteHeader } from "@/components/site-header";
import { CRISIS_RESOURCES } from "@/lib/onboarding";
import { WaitlistForm } from "./WaitlistForm";

export const metadata = {
  title: "Join the waitlist · sobrandsteady",
  description: "Join the sobrandsteady waitlist.",
};

export default function WaitlistPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader href="/" />

      <main className="mx-auto max-w-md px-6 py-12 sm:py-16">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Join the waitlist
        </h1>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            sobrandsteady is a companion for everyday life in recovery. It
            starts with you and what you&apos;re into, and it&apos;s here for a
            real conversation whenever you want one.
          </p>
          <p>
            We&apos;re rolling out access in stages. Join the list and we&apos;ll
            reach out when there&apos;s a spot. We won&apos;t share your email
            with anyone.
          </p>
        </div>

        <div className="mt-8">
          <WaitlistForm />
        </div>

        <div className="mt-10 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">
            If you need support right now
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {CRISIS_RESOURCES.map((r) => (
              <li key={r.label}>
                <a
                  href={r.href}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  {r.label}
                </a>
                , {r.detail}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
