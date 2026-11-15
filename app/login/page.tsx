import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Card, Logo } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" aria-label="BreakBoard home">
            <Logo className="text-lg" />
          </Link>
          <h1 className="mt-6 text-xl font-semibold tracking-tight">Sign in to the admin dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage break-test runs and triage bugs.</p>
        </div>

        <Card className="p-6">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-zinc-100" />}>
            <LoginFormWithDemo />
          </Suspense>
        </Card>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/" className="font-medium text-zinc-700 hover:text-zinc-900">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

/** Reads env at request time (not build time) so changing .env.local takes effect. */
async function LoginFormWithDemo() {
  await connection();
  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;
  return <LoginForm demo={email && password ? { email, password } : null} />;
}
