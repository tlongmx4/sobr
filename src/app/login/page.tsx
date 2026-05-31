'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthError, useAuth } from '@/context/auth';
import { useState } from 'react';
import { SiteHeader } from '@/components/site-header';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    const mutation = useMutation({
        mutationFn: ({ email, password }: { email: string; password: string }) =>
            login(email, password),
        onSuccess: () => {
            router.push("/");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setResent(false);
        mutation.mutate({ email, password });
    };

    async function handleResendVerification() {
        if (!email || resending) return;
        setResending(true);
        try {
            await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            setResent(true);
        } finally {
            setResending(false);
        }
    }

    const err = mutation.error instanceof AuthError ? mutation.error : null;
    const isNotVerified = err?.code === "EMAIL_NOT_VERIFIED";
    const isLocked = err?.code === "LOCKED";
    const lockMinutes = err?.retryAfter
        ? Math.max(1, Math.ceil(err.retryAfter / 60))
        : 15;

    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <SiteHeader />
            <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="mt-6 text-center font-heading text-3xl font-semibold tracking-tight">
                        Sign in to sobrandsteady
                    </h2>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {mutation.isError && !isNotVerified && !isLocked && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                            {mutation.error instanceof Error ? mutation.error.message : "An error occurred"}
                        </div>
                    )}

                    {isLocked && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                            Too many failed attempts. Try again in about {lockMinutes} minute{lockMinutes === 1 ? "" : "s"}.
                        </div>
                    )}

                    {isNotVerified && (
                        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
                            <p className="text-foreground">
                                Please verify your email before signing in.
                            </p>
                            {resent ? (
                                <p className="text-muted-foreground">
                                    Sent a new link to <span className="text-foreground">{email}</span>.
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={resending}
                                    className="text-primary underline-offset-2 hover:underline disabled:opacity-60"
                                >
                                    {resending ? "Sending…" : "Resend verification email"}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="relative block w-full rounded-t-md border border-input bg-background py-2 px-3 text-foreground placeholder:text-muted-foreground focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="relative block w-full rounded-b-md border border-input bg-background py-2 px-3 text-foreground placeholder:text-muted-foreground focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {mutation.isPending ? "Signing in..." : "Sign in"}
                    </button>

                    <div className="space-y-4 pt-1 text-center text-sm">
                        <Link
                            href="/forgot-password"
                            className="block font-medium text-primary underline-offset-2 hover:underline"
                        >
                            Forgot your password?
                        </Link>
                        <p className="border-t border-border pt-4 text-muted-foreground">
                            New to sobrandsteady?{" "}
                            <Link
                                href="/signup"
                                className="font-semibold text-primary underline-offset-2 hover:underline"
                            >
                                Create an account
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
            </div>
        </div>
    );
}
