"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  // useSearchParams must be inside a Suspense boundary or static prerender fails.
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <CenteredCard>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          No token provided
        </h1>
        <p className="text-sm text-muted-foreground">
          This page expects a link from a password reset email.
        </p>
        <Button asChild variant="outline">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </CenteredCard>
    );
  }

  if (done) {
    return (
      <CenteredCard>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Password updated
        </h1>
        <p className="text-sm text-muted-foreground">
          You can sign in with your new password now.
        </p>
        <Button asChild>
          <Link href="/login">Continue to login</Link>
        </Button>
      </CenteredCard>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const data = await res.json().catch(() => null);
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Couldn't reset your password.",
        );
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenteredCard>
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="text-sm text-muted-foreground">
          8+ characters. Make it something you&apos;ll remember.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="block w-full rounded-md border border-input bg-background py-2 px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
        />
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className="block w-full rounded-md border border-input bg-background py-2 px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </CenteredCard>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-5 text-center">{children}</div>
    </div>
  );
}
