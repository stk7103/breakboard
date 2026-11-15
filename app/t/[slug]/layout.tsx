import Link from "next/link";
import { Logo } from "@/components/ui";

/** Shared chrome for the public tester portal, so error.tsx / not-found.tsx keep the header and footer. */
export default function TesterPortalLayout({ children }: LayoutProps<"/t/[slug]">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="BreakBoard home">
            <Logo />
          </Link>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
            Public tester portal
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-zinc-200 bg-white">
        <p className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-zinc-500 sm:px-6">
          Please don&apos;t share real personal data. Emails, phone numbers, UPI IDs and ID numbers in reports are masked
          automatically.
        </p>
      </footer>
    </div>
  );
}
