"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { scoreToColor, type HistoryDay } from "@/lib/checkins";
import { cn } from "@/lib/utils";

function chunkWeeks(days: HistoryDay[]): HistoryDay[][] {
  const weeks: HistoryDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function formatDate(dateKey: string): string {
  // dateKey is a UTC YYYY-MM-DD; format in UTC so it matches the bucketed day.
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Sample scores 1..5 for the gradient legend.
const LEGEND_SCORES = [1, 2, 3, 4, 5];

export function CheckInHistory({ days }: { days: HistoryDay[] }) {
  const weeks = chunkWeeks(days);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs uppercase tracking-wide font-medium">
          Check-in history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <TooltipProvider delayDuration={100}>
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <Cell key={day.date} day={day} />
                ))}
              </div>
            ))}
          </div>
        </TooltipProvider>

        <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {LEGEND_SCORES.map((s) => (
            <span
              key={s}
              className="size-3 rounded-[3px]"
              style={{ backgroundColor: scoreToColor(s) }}
            />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Cell({ day }: { day: HistoryDay }) {
  // Days past today in the current week: blank placeholder, keeps rows aligned.
  if (day.future) {
    return <span className="size-3 shrink-0 rounded-[3px]" aria-hidden />;
  }

  const { score } = day;
  const label =
    score != null
      ? `${formatDate(day.date)} · score ${score.toFixed(1)} / 5`
      : `${formatDate(day.date)} · no check-in`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "size-3 shrink-0 rounded-[3px] ring-1 ring-inset ring-foreground/5",
            // No check-in: faint warm-neutral, never on the gradient.
            score == null && "bg-secondary",
          )}
          style={
            score != null
              ? { backgroundColor: scoreToColor(score) }
              : undefined
          }
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
