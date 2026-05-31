import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  // When set, the lockup renders as a link (e.g. back to home on public pages).
  href?: string;
  className?: string;
};

// Shared logo + wordmark lockup. Used in the dashboard header and on public
// pages so the brand stays in sync. Presentational only (no hooks), so it works
// in both server and client components.
export function BrandMark({ href, className }: Props) {
  const inner = (
    <>
      <Sparkles className="size-5 text-primary" />
      <span className="font-heading text-lg font-semibold tracking-tight">
        sobrandsteady
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="sobrandsteady home"
        className={cn("flex items-center gap-2", className)}
      >
        {inner}
      </Link>
    );
  }

  return <div className={cn("flex items-center gap-2", className)}>{inner}</div>;
}
