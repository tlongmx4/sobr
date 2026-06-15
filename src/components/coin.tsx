import { cn } from "@/lib/utils";
import { coinParts } from "@/lib/milestones";

// A minted milestone coin: a warm bronze disc in the brand's terracotta palette
// (primary hue ~40). Deliberately understated, not a gold trophy. The face shows
// the value large and the unit small, e.g. "30" over "DAYS".

type Props = {
  milestone: string;
  size?: "md" | "lg";
  className?: string;
};

export function Coin({ milestone, size = "md", className }: Props) {
  const { value, unit } = coinParts(milestone);
  const dim = size === "lg" ? "size-28" : "size-24";
  const valueSize = size === "lg" ? "text-3xl" : "text-2xl";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full select-none",
        dim,
        className,
      )}
      style={{
        background:
          "radial-gradient(circle at 50% 30%, oklch(0.92 0.045 60), oklch(0.74 0.095 45) 76%, oklch(0.66 0.1 42))",
        boxShadow:
          "inset 0 1px 2px oklch(0.99 0.02 80 / 0.55), 0 1px 2px oklch(0.3 0.05 40 / 0.18)",
      }}
      aria-label={`${value} ${unit}`}
    >
      {/* Engraved inner rim, like a struck coin edge. */}
      <div
        className="absolute inset-[5px] rounded-full"
        style={{ border: "1px solid oklch(0.45 0.1 40 / 0.3)" }}
      />
      <div className="relative px-1 text-center leading-none">
        <div
          className={cn("font-semibold tabular-nums", valueSize)}
          style={{ color: "oklch(0.32 0.07 40)" }}
        >
          {value}
        </div>
        <div
          className="mt-1 text-[10px] uppercase tracking-widest"
          style={{ color: "oklch(0.42 0.06 40)" }}
        >
          {unit}
        </div>
      </div>
    </div>
  );
}
