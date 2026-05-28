"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Status = "verifying" | "success" | "error" | "no-token";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "no-token");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (res.ok) {
          setStatus("success");
        } else {
          const data = await res.json().catch(() => null);
          setErrorMessage(
            typeof data?.error === "string"
              ? data.error
              : "Couldn't verify your email.",
          );
          setStatus("error");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Network error. Please try again.");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {status === "verifying" && "Verifying your email…"}
          {status === "success" && "You're in."}
          {status === "error" && "Something went wrong."}
          {status === "no-token" && "No token provided."}
        </h1>
        {status === "success" && (
          <>
            <p className="text-muted-foreground">
              Your email is verified. You can sign in now.
            </p>
            <Button asChild>
              <Link href="/login">Continue to login</Link>
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button asChild variant="outline">
              <Link href="/login">Back to login</Link>
            </Button>
          </>
        )}
        {status === "no-token" && (
          <>
            <p className="text-muted-foreground">
              This page expects a verification link from your email.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">Back to login</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
