import Link from "next/link";
import { Card, buttonStyles } from "@/components/ui";

export default function BoardNotFound() {
  return (
    <Card className="mx-auto max-w-lg px-6 py-12 text-center">
      <h1 className="text-lg font-semibold">Board not found</h1>
      <p className="mt-1 text-sm text-zinc-500">Check the link you were sent. It may have a typo, or the board was removed.</p>
      <Link href="/" className={`${buttonStyles("secondary", "sm")} mt-5`}>
        Go to BreakBoard
      </Link>
    </Card>
  );
}
