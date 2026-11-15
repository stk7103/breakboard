"use client";

import { useActionState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "./actions";
import { buttonStyles, inputStyles, labelStyles } from "@/components/ui";

type Props = {
  /** Demo credentials for the one-click fill helper (null when not configured). */
  demo: { email: string; password: string } | null;
};

export function LoginForm({ demo }: Props) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  const next = useSearchParams().get("next") ?? "/dashboard";
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function fillDemo() {
    if (!demo || !emailRef.current || !passwordRef.current) return;
    emailRef.current.value = demo.email;
    passwordRef.current.value = demo.password;
    passwordRef.current.focus();
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className={labelStyles}>
          Email
        </label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          placeholder="you@company.com"
          className={inputStyles}
        />
      </div>

      <div>
        <label htmlFor="password" className={labelStyles}>
          Password
        </label>
        <input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputStyles}
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${buttonStyles("primary")} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      {demo && (
        <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-indigo-900">
              <p className="font-medium">Demo account</p>
              <p className="text-indigo-700">{demo.email}</p>
            </div>
            <button type="button" onClick={fillDemo} className={buttonStyles("secondary", "sm")}>
              Fill Demo Credentials
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
