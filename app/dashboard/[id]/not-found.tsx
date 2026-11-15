import Link from "next/link";
import { Card, buttonStyles } from "@/components/ui";

export default function RunNotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Card className="px-6 py-12 text-center">
        <h2 className="font-semibold">Run not found</h2>
        <p className="mt-1 text-sm text-zinc-500">It may have been deleted, or the link is wrong.</p>
        <Link href="/dashboard" className={`${buttonStyles("secondary", "sm")} mt-5`}>
          Back to all runs
        </Link>
      </Card>
    </div>
  );
}
