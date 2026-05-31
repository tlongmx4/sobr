"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Result = { status: "added" | "already" };

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [note, setNote] = useState("");
  const [already, setAlready] = useState(false);

  const mutation = useMutation({
    mutationFn: async (): Promise<Result> => {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          ...(firstName.trim() && { firstName: firstName.trim() }),
          ...(note.trim() && { note: note.trim() }),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Couldn't add you to the list. Please try again.",
        );
      }
      return res.json();
    },
    onSuccess: (data) => setAlready(data.status === "already"),
  });

  if (mutation.isSuccess) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {already ? "You're already on the list." : "You're on the list."}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {already
            ? "We already had your email. We'll reach out when there's a spot."
            : "Thanks for your interest. We'll reach out when there's a spot."}
        </p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || mutation.isPending) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          maxLength={255}
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="firstName">
          First name
          <span className="ml-1 text-muted-foreground/70">(optional)</span>
        </Label>
        <Input
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="What we should call you"
          maxLength={100}
          autoComplete="given-name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">
          Anything you&apos;d like us to know?
          <span className="ml-1 text-muted-foreground/70">(optional)</span>
        </Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Totally optional."
          rows={3}
          maxLength={1000}
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

      <Button
        type="submit"
        className="w-full"
        disabled={!email.trim() || mutation.isPending}
      >
        {mutation.isPending ? "Joining..." : "Join the waitlist"}
      </Button>
    </form>
  );
}
