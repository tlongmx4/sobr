"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ScaleOption = { emoji: string; label: string };

const MOOD: ScaleOption[] = [
  { emoji: "😔", label: "low" },
  { emoji: "😕", label: "off" },
  { emoji: "😐", label: "ok" },
  { emoji: "🙂", label: "good" },
  { emoji: "😄", label: "great" },
];

const ENERGY: ScaleOption[] = [
  { emoji: "🥱", label: "drained" },
  { emoji: "😴", label: "tired" },
  { emoji: "😐", label: "ok" },
  { emoji: "🙂", label: "steady" },
  { emoji: "💪", label: "strong" },
];

const CRAVING: ScaleOption[] = [
  { emoji: "😌", label: "none" },
  { emoji: "🙂", label: "mild" },
  { emoji: "😐", label: "some" },
  { emoji: "😟", label: "strong" },
  { emoji: "😣", label: "intense" },
];

export function CheckInDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [craving, setCraving] = useState<number | null>(null);
  const [journal, setJournal] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moodRating: mood,
          energyRating: energy,
          ...(craving !== null && { cravingRating: craving }),
          ...(journal.trim() && { journalEntry: journal.trim() }),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.error === "string" ? data.error : "Couldn't save check-in",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      reset();
      onOpenChange(false);
      router.refresh();
    },
  });

  function reset() {
    setMood(null);
    setEnergy(null);
    setCraving(null);
    setJournal("");
    mutation.reset();
  }

  function handleOpenChange(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mood === null || energy === null) return;
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Today&apos;s check-in</DialogTitle>
          <DialogDescription>
            A quick read on where you are. Mood and energy are required, the rest is optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Scale
            label="Mood"
            options={MOOD}
            value={mood}
            onChange={setMood}
          />
          <Scale
            label="Energy"
            options={ENERGY}
            value={energy}
            onChange={setEnergy}
          />
          <Scale
            label="Cravings"
            optional
            options={CRAVING}
            value={craving}
            onChange={setCraving}
            allowClear
          />

          <div className="space-y-1.5">
            <Label
              htmlFor="journal"
              className="text-xs uppercase tracking-wide font-medium text-muted-foreground"
            >
              Anything else
              <span className="ml-1 normal-case tracking-normal text-muted-foreground/70">
                (optional)
              </span>
            </Label>
            <Textarea
              id="journal"
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="What's going on today?"
              rows={3}
              maxLength={5000}
              className="resize-none"
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Something went wrong"}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mood === null || energy === null || mutation.isPending}
            >
              {mutation.isPending ? "Saving..." : "Save check-in"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Scale({
  label,
  optional,
  options,
  value,
  onChange,
  allowClear = false,
}: {
  label: string;
  optional?: boolean;
  options: ScaleOption[];
  value: number | null;
  onChange: (v: number | null) => void;
  allowClear?: boolean;
}) {
  const endLow = options[0].label;
  const endHigh = options[options.length - 1].label;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
          {label}
          {optional && (
            <span className="ml-1 normal-case tracking-normal text-muted-foreground/70">
              (optional)
            </span>
          )}
        </Label>
        {value !== null && (
          <span className="text-xs text-muted-foreground capitalize">
            {options[value - 1].label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {options.map((opt, i) => {
          const n = i + 1;
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(allowClear && selected ? null : n)}
              className={cn(
                "h-12 flex-1 rounded-md border text-2xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                selected
                  ? "bg-primary/15 border-primary scale-105"
                  : "bg-background border-border opacity-60 hover:opacity-100 hover:border-primary/40",
              )}
              aria-label={`${label} ${opt.label}`}
              aria-pressed={selected}
            >
              {opt.emoji}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground/60">
        <span>{endLow}</span>
        <span>{endHigh}</span>
      </div>
    </div>
  );
}
