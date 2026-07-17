"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-16 md:py-24">
      <div className="w-full max-w-sm rounded-xl bg-surface-card p-6 shadow-soft-card md:p-8">
        <h1 className="mb-1 text-2xl font-extrabold text-on-surface">Welcome back</h1>
        <p className="mb-6 text-sm text-on-surface-variant">
          Log in to review your saved analyses.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="mb-2 ml-1 block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg bg-background px-4 py-3 text-[15px] font-semibold text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 ml-1 block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg bg-background px-4 py-3 text-[15px] font-semibold text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-primary px-8 py-4 text-[15px] font-extrabold text-on-primary shadow-playful-button transition-all hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-primary">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
