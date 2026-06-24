"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PropertyRecord } from "@/lib/services/properties";

/**
 * One property row (build-spec §9): edit the address, or archive / un-archive.
 * Archiving asks for confirmation; it's a soft remove — historical tickets keep
 * their address snapshot and are unaffected.
 */
export function PropertyItem({ property }: { property: PropertyRecord }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [address, setAddress] = React.useState(property.address);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function patch(body: { address?: string; archived?: boolean }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: { ok: boolean; error?: string } = await res
        .json()
        .catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Update failed.");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  function onArchive() {
    if (window.confirm(`Archive "${property.address}"? It will no longer appear for new tenant requests.`)) {
      void patch({ archived: true });
    }
  }

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3 align-top">
        {editing ? (
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            aria-label="Property address"
            className="max-w-md"
          />
        ) : (
          <span className={property.archived ? "text-muted-foreground" : ""}>
            {property.address}
          </span>
        )}
        {error ? (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={
            property.archived
              ? "rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              : "rounded bg-success/15 px-2 py-0.5 text-xs text-success"
          }
        >
          {property.archived ? "Archived" : "Active"}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap justify-end gap-2">
          {editing ? (
            <>
              <Button
                size="sm"
                disabled={busy || address.trim().length === 0}
                onClick={() => patch({ address })}
              >
                {busy ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setAddress(property.address);
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              {property.archived ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => patch({ archived: false })}
                >
                  Un-archive
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={onArchive}
                >
                  Archive
                </Button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
