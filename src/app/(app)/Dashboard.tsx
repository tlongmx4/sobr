"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Send, Square, CalendarCheck2, Sparkles, LogOut, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/auth";
import { CheckInDialog } from "./CheckInDialog";

type DashboardUser = {
  id: string;
  name: string;
  preferredName: string | null;
  sobrietyStatus: string;
  sobrietyDate: string | null;
};

type TodayCheckIn = {
  moodRating: number;
  energyRating: number;
  cravingRating: number | null;
} | null;

type Props = {
  user: DashboardUser;
  initialMessages: UIMessage[];
  todayCheckIn: TodayCheckIn;
};

const STATUS_LABELS: Record<string, string> = {
  SOBER: "Sober",
  IM_NOT: "Not sober",
  CUTTING_BACK: "Cutting back",
  THINKING_ABOUT_IT: "Thinking about it",
  SUPPORTING_SOMEONE: "Supporting someone",
  EXPLORING: "Exploring",
  PREFER_NOT_TO_SAY: "Private",
};

function daysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  const ms = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function Dashboard({ user, initialMessages, todayCheckIn }: Props) {
  const router = useRouter();
  const { logout } = useAuth();
  const [input, setInput] = useState("");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop, error } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const displayName = user.preferredName || user.name;
  const isBusy = status === "streaming" || status === "submitted";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    setInput("");
    await sendMessage({ text: trimmed });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex items-center justify-between border-b bg-card px-6 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <span className="font-heading text-lg font-semibold tracking-tight">
            sobrandsteady
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:block">
            Hey, {displayName}
          </span>
          <Button variant="ghost" size="icon-sm" asChild aria-label="Settings">
            <Link href="/settings">
              <SettingsIcon className="size-3.5" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r bg-muted/30 p-4 md:flex">
          <SobrietyCard user={user} />
          <CheckInCard
            todayCheckIn={todayCheckIn}
            onCheckIn={() => setCheckInOpen(true)}
          />
          <QuickLinksCard />
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto scroll-smooth"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
              {messages.length === 0 ? (
                <EmptyState name={displayName} />
              ) : (
                messages.map((m) => <MessageBubble key={m.id} message={m} />)
              )}

              {status === "submitted" && <TypingIndicator />}

              {error && (
                <div className="self-start rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Something went wrong. Try again.
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t bg-card px-4 py-3 sm:px-6"
          >
            <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind?"
                rows={1}
                className="max-h-40 min-h-10 resize-none"
                disabled={false}
              />
              {isBusy ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => stop()}
                  aria-label="Stop"
                >
                  <Square className="size-3.5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim()}
                  aria-label="Send"
                >
                  <Send className="size-3.5" />
                </Button>
              )}
            </div>
          </form>
        </main>
      </div>

      <CheckInDialog open={checkInOpen} onOpenChange={setCheckInOpen} />
    </div>
  );
}

function SobrietyCard({ user }: { user: DashboardUser }) {
  if (user.sobrietyDate) {
    const days = daysSince(user.sobrietyDate);
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-xs uppercase tracking-wide font-medium">
            Sobriety
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tabular-nums">{days}</span>
            <span className="text-sm text-muted-foreground">
              {days === 1 ? "day" : "days"}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs uppercase tracking-wide font-medium">
          Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-base font-medium">
          {STATUS_LABELS[user.sobrietyStatus] ?? user.sobrietyStatus}
        </span>
      </CardContent>
    </Card>
  );
}

const MOOD_EMOJI = ["😔", "😕", "😐", "🙂", "😄"];
const ENERGY_EMOJI = ["🥱", "😴", "😐", "🙂", "💪"];
const CRAVING_EMOJI = ["😌", "🙂", "😐", "😟", "😣"];

function CheckInCard({
  todayCheckIn,
  onCheckIn,
}: {
  todayCheckIn: TodayCheckIn;
  onCheckIn: () => void;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs uppercase tracking-wide font-medium">
          Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todayCheckIn ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm">
              <CalendarCheck2 className="size-3.5 text-primary" />
              <span className="text-muted-foreground">Checked in</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Stat
                label="Mood"
                value={MOOD_EMOJI[todayCheckIn.moodRating - 1]}
              />
              <Stat
                label="Energy"
                value={ENERGY_EMOJI[todayCheckIn.energyRating - 1]}
              />
              <Stat
                label="Craving"
                value={
                  todayCheckIn.cravingRating
                    ? CRAVING_EMOJI[todayCheckIn.cravingRating - 1]
                    : "—"
                }
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t checked in yet today.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onCheckIn}
            >
              Check in
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background px-2 py-1.5 text-center ring-1 ring-border">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-lg leading-none mt-0.5">{value}</div>
    </div>
  );
}

function QuickLinksCard() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs uppercase tracking-wide font-medium">
          Quick links
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <Link
          href="/settings"
          className="text-left text-sm text-muted-foreground hover:text-foreground py-1"
        >
          Settings
        </Link>
        <Link
          href="/privacy"
          className="text-left text-sm text-muted-foreground hover:text-foreground py-1"
        >
          Privacy
        </Link>
      </CardContent>
    </Card>
  );
}

function EmptyState({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-start gap-2 py-8">
      <Sparkles className="size-5 text-primary" />
      <h2 className="font-heading text-2xl font-semibold tracking-tight">
        Hey {name}.
      </h2>
      <p className="text-muted-foreground">
        What&apos;s going on? Anything on your mind today?
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = extractText(message);
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-sm text-card-foreground ring-1 ring-border">
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="whitespace-pre-wrap not-last:mb-2">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
            ),
            li: ({ children }) => <li className="leading-snug">{children}</li>,
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {children}
              </a>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-card px-4 py-3 ring-1 ring-border">
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
      </div>
    </div>
  );
}
