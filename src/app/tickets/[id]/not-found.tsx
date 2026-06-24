import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function TicketNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-xl font-semibold">Ticket not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This ticket doesn&apos;t exist or may have been removed.
      </p>
      <Link
        href="/dashboard"
        className={`mt-4 inline-flex ${buttonVariants({ variant: "outline" })}`}
      >
        Back to dashboard
      </Link>
    </main>
  );
}
