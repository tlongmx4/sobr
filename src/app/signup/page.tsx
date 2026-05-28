'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth';
import { useState } from 'react';

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
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {mutation.isError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 border border-red-200">
              {mutation.error instanceof Error ? mutation.error.message : "An error occurred"}
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
                className="relative block w-full border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
                className="relative block w-full border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
                className="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Password (8+ characters)"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? "Signing up..." : "Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}