import Link from "next/link";
import { logout } from "@/app/login/actions";
import { Logo, buttonStyles } from "@/components/ui";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" aria-label="Dashboard home">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 text-sm sm:flex">
              <Link href="/dashboard" className="rounded-md px-2.5 py-1.5 font-medium text-zinc-900 hover:bg-zinc-100">
                Runs
              </Link>
              <Link href="/" className="rounded-md px-2.5 py-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
                Home
              </Link>
            </nav>
          </div>
          <form action={logout}>
            <button type="submit" className={buttonStyles("ghost", "sm")}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
