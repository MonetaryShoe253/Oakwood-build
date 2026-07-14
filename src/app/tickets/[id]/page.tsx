import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { DemoBanner } from "@/components/demo-banner";
import { InternalNotes } from "@/components/internal-notes";
import { StatusSelect } from "@/components/status-select";
import { buttonVariants } from "@/components/ui/button";
import { DEMO_MODE } from "@/lib/demo";
import { exactTime, relativeTime } from "@/lib/format";
import { getTicketById } from "@/lib/services/tickets";
import { getObjectUrl } from "@/lib/storage";
import {
  categoryLabel,
  statusLabel,
  type CategoryValue,
  type StatusValue,
} from "@/lib/validation/ticket";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!DEMO_MODE && !session?.user) redirect("/login");

  const { id } = await params;
  const ticket = await getTicketById(id);
  if (!ticket) notFound();

  const photoUrl = ticket.photoKey ? getObjectUrl(ticket.photoKey) : null;

  return (
    <>
      {DEMO_MODE ? <DemoBanner /> : null}
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← Back to dashboard
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ticket #{ticket.reference}
          </h1>
          <p className="text-sm text-muted-foreground">
            Logged{" "}
            <span title={exactTime(ticket.createdAt)}>
              {relativeTime(ticket.createdAt)}
            </span>
            {ticket.resolvedAt ? (
              <>
                {" · resolved "}
                <span title={exactTime(ticket.resolvedAt)}>
                  {relativeTime(ticket.resolvedAt)}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="w-[210px]">
          <span className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
            Status — {statusLabel(ticket.status as StatusValue)}
          </span>
          <StatusSelect
            ticketId={ticket.id}
            initialStatus={ticket.status as StatusValue}
          />
        </div>
      </header>

      {/* Tenant contact — prominent; primary call-back info (§8). */}
      <section className="mt-6 rounded-lg border border-input bg-muted/30 p-4">
        <h2 className="text-sm font-semibold">Tenant contact</h2>
        <p className="mt-1 text-lg font-medium">{ticket.tenantName}</p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <a
            href={`tel:${ticket.tenantPhone}`}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            📞 {ticket.tenantPhone}
          </a>
          <a
            href={`mailto:${ticket.tenantEmail}`}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            ✉️ {ticket.tenantEmail}
          </a>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Detail label="Property">{ticket.propertyAddressSnapshot}</Detail>
        <Detail label="Category">
          {categoryLabel(ticket.category as CategoryValue)}
        </Detail>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Description</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
          {ticket.description}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">Photo</h2>
        {ticket.photoKey ? (
          photoUrl ? (
            <a href={photoUrl} target="_blank" rel="noopener noreferrer">
              <Image
                src={photoUrl}
                alt={`Photo for ticket #${ticket.reference}`}
                width={320}
                height={240}
                unoptimized
                className="h-auto max-h-60 w-auto rounded-md border border-input"
              />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Photo attached — preview unavailable (storage not configured).
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">No photo provided.</p>
        )}
      </section>

      <section className="mt-8 border-t border-border pt-6">
        <InternalNotes
          ticketId={ticket.id}
          initialNotes={ticket.internalNotes}
        />
      </section>

      <div className="mt-8">
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to dashboard
        </Link>
      </div>
      </main>
    </>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </h2>
      <p className="mt-0.5 text-sm font-medium">{children}</p>
    </div>
  );
}
