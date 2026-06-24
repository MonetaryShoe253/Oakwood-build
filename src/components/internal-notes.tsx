"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Internal notes editor (build-spec §8). One mutable text field (not a thread):
 * pre-filled, Save PATCHes, shows dirty/saved state, and warns on navigate-away
 * with unsaved changes.
 */
export function InternalNotes({
  ticketId,
  initialNotes,
}: {
  ticketId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [saved, setSaved] = React.useState(initialNotes ?? "");
  const [value, setValue] = React.useState(initialNotes ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [justSaved, setJustSaved] = React.useState(false);

  const dirty = value !== saved;

  React.useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function save() {
    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes: value }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setSaved(value);
      setJustSaved(true);
      router.refresh();
    } catch {
      setError("Couldn't save notes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="internalNotes">Internal notes</Label>
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {dirty ? "Unsaved changes" : justSaved ? "Saved" : null}
        </span>
      </div>
      <Textarea
        id="internalNotes"
        value={value}
        rows={6}
        maxLength={10000}
        onChange={(e) => {
          setValue(e.target.value);
          setJustSaved(false);
        }}
        placeholder="Notes for the team (not visible to the tenant)…"
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button onClick={save} disabled={saving || !dirty}>
        {saving ? "Saving…" : "Save notes"}
      </Button>
    </div>
  );
}
