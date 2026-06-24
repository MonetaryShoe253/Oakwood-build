"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center">
        <h2 className="text-lg font-semibold">Couldn&apos;t load tickets</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Something went wrong while loading the dashboard.
        </p>
        <Button className="mt-4" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
