"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckEmailPage() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (!email || resending) return;
    setResending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError("Couldn't send a new link. Please try again.");
      } else {
        setResent(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-5 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{email || "your inbox"}</span>.
          Click it to finish setting up your account.
        </p>

        <div className="flex flex-col items-center gap-3 pt-2">
          {resent ? (
            <p className="text-sm text-muted-foreground">
              Sent another one. Give it a minute.
            </p>
          ) : (
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={!email || resending}
            >
              {resending ? "Sending…" : "Resend the link"}
            </Button>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Already verified? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
