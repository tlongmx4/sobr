"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import {
  DialogPortal,
  DialogOverlay,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CRISIS_RESOURCES,
  DISCLAIMERS,
  ACCEPTANCE_LABEL,
} from "@/lib/onboarding";

type Props = {
  open: boolean;
};

const FRAMEWORKS: { value: string; label: string }[] = [
  { value: "BIBLE", label: "Bible" },
  { value: "TWELVE_STEP", label: "12-step" },
  { value: "BOTH", label: "Both" },
  { value: "NEITHER", label: "Neither" },
];

const SOBRIETY_STATUSES: { value: string; label: string }[] = [
  { value: "SOBER", label: "Sober" },
  { value: "CUTTING_BACK", label: "Cutting back" },
  { value: "THINKING_ABOUT_IT", label: "Thinking about it" },
  { value: "EXPLORING", label: "Exploring" },
  { value: "SUPPORTING_SOMEONE", label: "Supporting someone" },
  { value: "IM_NOT", label: "Not sober" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

const STEP_COUNT = 6;

export function OnboardingDialog({ open }: Props) {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [preferredName, setPreferredName] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [framework, setFramework] = useState<string | null>(null);
  const [sobrietyStatus, setSobrietyStatus] = useState<string | null>(null);
  const [sobrietyDate, setSobrietyDate] = useState("");
  const [substances, setSubstances] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { disclaimersAccepted: true };
      if (preferredName.trim()) payload.preferredName = preferredName.trim();
      if (hobbies.length) payload.hobbies = hobbies;
      if (framework) payload.frameworkPreference = framework;
      if (sobrietyStatus) payload.sobrietyStatus = sobrietyStatus;
      if (sobrietyDate) payload.sobrietyDate = sobrietyDate;
      if (substances.length) payload.substances = substances;

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Couldn't save your answers",
        );
      }
      return res.json();
    },
    // The server now has onboardingCompletedAt set, so the refreshed page
    // recomputes needsOnboarding as false and this dialog closes.
    onSuccess: () => router.refresh(),
  });

  const isLast = step === STEP_COUNT - 1;
  const canContinue = step === 0 ? accepted : true;

  function handleNext() {
    if (isLast) {
      mutation.mutate();
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPortal>
        {/* Strong, controllable blur over the dashboard behind the gate. */}
        <DialogOverlay className="bg-black/30 backdrop-blur-md supports-backdrop-filter:backdrop-blur-md" />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          // Blocking gate: no close button, no escape, no click-outside.
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr_auto] gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 sm:max-w-lg"
        >
          <DialogHeader>
            <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
              Step {step + 1} of {STEP_COUNT}
            </p>
            {renderHeader(step)}
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto">
            {step === 0 && (
              <DisclaimerStep accepted={accepted} onAccept={setAccepted} />
            )}
            {step === 1 && (
              <NameStep value={preferredName} onChange={setPreferredName} />
            )}
            {step === 2 && (
              <ChipStep
                label="Hobbies and interests"
                placeholder="Type one and press Enter"
                hint="Up to 20. This helps sobr know you as a person, not a label."
                values={hobbies}
                onChange={setHobbies}
                max={20}
              />
            )}
            {step === 3 && (
              <FrameworkStep value={framework} onChange={setFramework} />
            )}
            {step === 4 && (
              <SobrietyStep
                status={sobrietyStatus}
                onStatusChange={setSobrietyStatus}
                date={sobrietyDate}
                onDateChange={setSobrietyDate}
              />
            )}
            {step === 5 && (
              <ChipStep
                label="Anything you're tracking"
                placeholder="Type one and press Enter"
                hint="Optional. Up to 10. You can change this anytime in settings."
                values={substances}
                onChange={setSubstances}
                max={10}
              />
            )}

            {mutation.isError && (
              <p className="mt-3 text-sm text-destructive">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Something went wrong"}
              </p>
            )}
          </div>

          <DialogFooter>
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                disabled={mutation.isPending}
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canContinue || mutation.isPending}
            >
              {isLast
                ? mutation.isPending
                  ? "Saving..."
                  : "Finish"
                : "Continue"}
            </Button>
          </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

function renderHeader(step: number) {
  switch (step) {
    case 0:
      return (
        <>
          <DialogTitle>Before we start</DialogTitle>
          <DialogDescription>
            A few things to know. Please read these, then agree to continue.
          </DialogDescription>
        </>
      );
    case 1:
      return (
        <>
          <DialogTitle>What should sobr call you?</DialogTitle>
          <DialogDescription>Optional. You can skip this.</DialogDescription>
        </>
      );
    case 2:
      return (
        <>
          <DialogTitle>What are you into?</DialogTitle>
          <DialogDescription>
            The stuff you enjoy, not your recovery status.
          </DialogDescription>
        </>
      );
    case 3:
      return (
        <>
          <DialogTitle>What fits you best?</DialogTitle>
          <DialogDescription>
            This shapes how sobr talks with you. You can change it later.
          </DialogDescription>
        </>
      );
    case 4:
      return (
        <>
          <DialogTitle>Where are you right now?</DialogTitle>
          <DialogDescription>
            However you answer is fine. All optional.
          </DialogDescription>
        </>
      );
    default:
      return (
        <>
          <DialogTitle>One last thing</DialogTitle>
          <DialogDescription>
            Only if it helps. You can skip this too.
          </DialogDescription>
        </>
      );
  }
}

function DisclaimerStep({
  accepted,
  onAccept,
}: {
  accepted: boolean;
  onAccept: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Crisis resources are non-gated: always visible and reachable here,
          before and regardless of acceptance. */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-xs uppercase tracking-wide font-medium text-destructive">
          In a crisis, reach a real person now
        </p>
        <ul className="mt-2 space-y-1.5">
          {CRISIS_RESOURCES.map((r) => (
            <li key={r.label} className="text-sm">
              <a
                href={r.href}
                className="font-semibold text-foreground underline underline-offset-2"
              >
                {r.label}
              </a>
              <span className="text-muted-foreground">, {r.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        {DISCLAIMERS.map((d) => (
          <div key={d.title}>
            <p className="font-medium text-foreground">{d.title}</p>
            <p className="text-sm text-muted-foreground">{d.body}</p>
          </div>
        ))}
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAccept(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span className="text-sm text-foreground">{ACCEPTANCE_LABEL}</span>
      </label>
    </div>
  );
}

function NameStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="preferredName">Preferred name</Label>
      <Input
        id="preferredName"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What feels right"
        maxLength={100}
        autoFocus
      />
    </div>
  );
}

function FrameworkStep({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {FRAMEWORKS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onChange(f.value)}
          aria-pressed={value === f.value}
          className={cn(
            "h-12 rounded-lg border text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            value === f.value
              ? "border-primary bg-primary/15"
              : "border-border bg-background opacity-70 hover:opacity-100 hover:border-primary/40",
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function SobrietyStep({
  status,
  onStatusChange,
  date,
  onDateChange,
}: {
  status: string | null;
  onStatusChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
          Status
        </Label>
        <div className="flex flex-wrap gap-2">
          {SOBRIETY_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onStatusChange(s.value)}
              aria-pressed={status === s.value}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                status === s.value
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sobrietyDate">
          Sobriety date
          <span className="ml-1 normal-case tracking-normal text-muted-foreground/70">
            (optional)
          </span>
        </Label>
        <Input
          id="sobrietyDate"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-auto"
        />
      </div>
    </div>
  );
}

function ChipStep({
  label,
  placeholder,
  hint,
  values,
  onChange,
  max,
}: {
  label: string;
  placeholder: string;
  hint: string;
  values: string[];
  onChange: (v: string[]) => void;
  max: number;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim().slice(0, 50);
    if (!v || values.length >= max || values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  }

  function remove(item: string) {
    onChange(values.filter((v) => v !== item));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        placeholder={placeholder}
        maxLength={50}
        disabled={values.length >= max}
        autoFocus
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => remove(item)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-sm text-foreground hover:bg-primary/25"
              aria-label={`Remove ${item}`}
            >
              {item}
              <X className="size-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
