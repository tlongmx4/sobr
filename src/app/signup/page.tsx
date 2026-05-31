'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/auth';
import { useState } from 'react';
import { SiteHeader } from '@/components/site-header';

export default function SignupPage() {
    const router = useRouter();
    const { signup } = useAuth();

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const mutation = useMutation({
        mutationFn: ({ name, username, email, password }: { name: string; username: string; email: string; password: string }) =>
            signup(name, username, email, password),
        onSuccess: (_data, vars) => {
            router.push(`/check-email?email=${encodeURIComponent(vars.email)}`);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ name, username, email, password });
    };

    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <SiteHeader />
            <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <div>
                        <h2 className="mt-6 text-center font-heading text-3xl font-semibold tracking-tight">
                            Create your account
                        </h2>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {mutation.isError && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                {mutation.error instanceof Error ? mutation.error.message : "An error occurred"}
                            </div>
                        )}

                        <div className="-space-y-px rounded-md shadow-sm">
                            <div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="relative block w-full rounded-t-md border border-input bg-background py-2 px-3 text-foreground placeholder:text-muted-foreground focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                                    placeholder="Name"
                                />
                            </div>
                            <div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    minLength={3}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="relative block w-full border border-input bg-background py-2 px-3 text-foreground placeholder:text-muted-foreground focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                                    placeholder="Username"
                                />
                            </div>
                            <div>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="relative block w-full border border-input bg-background py-2 px-3 text-foreground placeholder:text-muted-foreground focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                                    placeholder="Email address"
                                />
                            </div>
                            <div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="relative block w-full rounded-b-md border border-input bg-background py-2 px-3 text-foreground placeholder:text-muted-foreground focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                                    placeholder="Password (8+ characters)"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {mutation.isPending ? "Signing up..." : "Sign up"}
                        </button>

                        <div className="pt-1 text-center text-sm">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                            >
                                <ArrowLeft className="size-3.5" />
                                Back to login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
