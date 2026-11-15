import type { ReactNode } from "react";
import {
  RUN_STATUS_LABELS,
  SCENARIO_STATUS_LABELS,
  type RunStatus,
  type ScenarioStatus,
  type Severity,
} from "@/lib/types";

/** Small, dependency-free UI primitives shared by server and client components. */

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500",
  secondary: "bg-white text-zinc-800 ring-1 ring-inset ring-zinc-300 shadow-sm hover:bg-zinc-50",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  danger: "bg-white text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function buttonStyles(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size]);
}

export const inputStyles =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 " +
  "placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600";

export const labelStyles = "mb-1.5 block text-sm font-medium text-zinc-700";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-zinc-900", className)}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
        <rect width="24" height="24" rx="6" className="fill-indigo-600" />
        <path d="M6 7h5v4H6zM13 7h5v4h-5zM6 13h5v4H6z" className="fill-white" />
        <path d="M13.5 13.5l4 4M17.5 13.5l-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      BreakBoard
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-zinc-200 bg-white shadow-sm", className)}>{children}</div>;
}

const BADGE_BASE = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

const SCENARIO_STATUS_STYLES: Record<ScenarioStatus, string> = {
  open: "bg-zinc-50 text-zinc-700 ring-zinc-300",
  submitted: "bg-amber-50 text-amber-800 ring-amber-300",
  confirmed_bug: "bg-red-50 text-red-700 ring-red-300",
  dismissed: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export function ScenarioStatusBadge({ status }: { status: ScenarioStatus }) {
  return <span className={cn(BADGE_BASE, SCENARIO_STATUS_STYLES[status])}>{SCENARIO_STATUS_LABELS[status]}</span>;
}

const RUN_STATUS_STYLES: Record<RunStatus, string> = {
  draft: "bg-zinc-50 text-zinc-700 ring-zinc-300",
  live: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  closed: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <span className={cn(BADGE_BASE, "gap-1.5", RUN_STATUS_STYLES[status])}>
      {status === "live" && <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}
      {RUN_STATUS_LABELS[status]}
    </span>
  );
}

const SEVERITY_STYLES: Record<Severity, string> = {
  Blocker: "bg-red-600 text-white ring-red-600",
  High: "bg-orange-50 text-orange-700 ring-orange-300",
  Medium: "bg-sky-50 text-sky-700 ring-sky-300",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={cn(BADGE_BASE, SEVERITY_STYLES[severity])}>{severity}</span>;
}
