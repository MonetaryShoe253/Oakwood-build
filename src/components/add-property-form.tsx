"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Add a property (build-spec §9): single address line. */
export function AddPropertyForm() {
  const router = useRouter();
  const [address, setAddress] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data: { ok: boolean; error?: string } = await res
        .json()
        .catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Couldn't add property.");
      }
      setAddress("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add property.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-input p-4">
      <Label htmlFor="new-address">Add a property</Label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <Input
          id="new-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 14 Elm Road, Flat 2"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "new-address-error" : undefined}
        />
        <Button type="submit" disabled={busy || address.trim().length === 0}>
          {busy ? "Adding…" : "Add"}
        </Button>
      </div>
      {error ? (
        <p id="new-address-error" role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
