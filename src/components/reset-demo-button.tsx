"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * Dashboard control (demo mode only) that restores the seed defaults via
 * POST /api/staff/reset. Confirms first — it wipes every ticket and property —
 * then refreshes the page to show the freshly-seeded data.
 */
export function ResetDemoButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onReset() {
    const ok = window.confirm(
      "Reset the demo to its default data?\n\nThis permanently deletes all current tickets and properties and restores the original showcase set.",
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/reset", { method: "POST" });
      const data: { ok?: boolean; error?: string } = await res
        .json()
        .catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Reset failed.");
      }
      // Land on a clean, unfiltered dashboard so the reset is obvious.
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        disabled={busy}
        title="Restore the demo's default tickets and properties"
      >
        {busy ? "Resetting…" : "Reset demo data"}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
