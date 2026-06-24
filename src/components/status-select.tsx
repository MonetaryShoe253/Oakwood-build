"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { NativeSelect } from "@/components/ui/native-select";
import {
  STATUS_OPTIONS,
  type StatusValue,
} from "@/lib/validation/ticket";

/**
 * Inline status dropdown for a dashboard row (build-spec §7). Optimistic:
 * updates immediately, PATCHes, and rolls back on error. On success it
 * refreshes server data (so a RESOLVED transition's side effects show).
 */
export function StatusSelect({
  ticketId,
  initialStatus,
}: {
  ticketId: string;
  initialStatus: StatusValue;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<StatusValue>(initialStatus);
  const [pending, setPending] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  async function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as StatusValue;
    const previous = status;
    setStatus(next); // optimistic
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      router.refresh();
    } catch {
      setStatus(previous); // rollback
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <NativeSelect
        aria-label="Change status"
        className="h-9 w-[190px]"
        value={status}
        onChange={onChange}
        disabled={pending}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      <span role="status" aria-live="polite" className="min-h-[1rem] text-xs">
        {failed ? (
          <span className="text-destructive">Couldn&apos;t update — retry.</span>
        ) : null}
      </span>
    </div>
  );
}
