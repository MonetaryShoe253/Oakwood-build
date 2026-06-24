import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { putObject } from "@/lib/storage";
import type {
  CategoryValue,
  StatusValue,
  TicketListQuery,
} from "@/lib/validation/ticket";

/** First human-facing reference; monotonic, never reused (build-spec §3). */
const FIRST_REFERENCE = 1001;
/** Retries if two concurrent creates pick the same reference (unique clash). */
const MAX_REFERENCE_ATTEMPTS = 5;

export interface CreateTicketInput {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyId: string;
  category: CategoryValue;
  description: string;
  /** Already-validated photo (mime + size). Optional. */
  photo?: {
    body: Uint8Array;
    /** Extension without the dot, e.g. "jpg" / "png". */
    ext: string;
    contentType: string;
  };
}

export interface CreatedTicket {
  id: string;
  reference: number;
}

/** Thrown when the selected property is missing or archived (→ 400). */
export class InvalidPropertyError extends Error {
  constructor() {
    super("Selected property does not exist or is no longer available.");
    this.name = "InvalidPropertyError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Create a maintenance ticket (build-spec §5):
 *  - assigns the next `reference` (from 1001) inside a transaction,
 *  - copies `propertyAddressSnapshot` from the selected active property,
 *  - defaults status to NEW.
 *
 * Photo upload is best-effort: a storage failure is logged and the ticket is
 * still created without a photo — a downstream failure must never lose the
 * ticket (§12). Emails (1 & 2) are wired in M7 and intentionally NOT sent here.
 */
export async function createTicket(
  input: CreateTicketInput,
): Promise<CreatedTicket> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    try {
      const ticket = await prisma.$transaction(async (tx) => {
        const property = await tx.property.findUnique({
          where: { id: input.propertyId },
          select: { address: true, archived: true },
        });
        if (!property || property.archived) {
          throw new InvalidPropertyError();
        }

        const last = await tx.ticket.findFirst({
          orderBy: { reference: "desc" },
          select: { reference: true },
        });
        const reference = last ? last.reference + 1 : FIRST_REFERENCE;

        return tx.ticket.create({
          data: {
            reference,
            propertyId: input.propertyId,
            propertyAddressSnapshot: property.address,
            tenantName: input.tenantName,
            tenantEmail: input.tenantEmail,
            tenantPhone: input.tenantPhone,
            category: input.category,
            description: input.description,
            status: "NEW",
          },
          select: { id: true, reference: true },
        });
      });

      await attachPhotoBestEffort(ticket.id, input.photo);

      // NOTE(M7): fire Email 1 (team) and Email 2 (tenant) here, post-commit
      // and non-blocking. Deferred per the build order (§14) — form first.

      return ticket;
    } catch (error) {
      if (error instanceof InvalidPropertyError) throw error;
      if (isUniqueViolation(error)) {
        lastError = error;
        continue; // reference collided; recompute and retry
      }
      throw error;
    }
  }

  throw new Error(
    `Failed to assign a unique ticket reference after ${MAX_REFERENCE_ATTEMPTS} attempts`,
    { cause: lastError },
  );
}

/** Tickets per dashboard page (build-spec §7). */
export const TICKET_PAGE_SIZE = 25;

export interface TicketListRow {
  id: string;
  reference: number;
  createdAt: Date;
  propertyAddressSnapshot: string;
  tenantName: string;
  category: CategoryValue;
  status: StatusValue;
  hasPhoto: boolean;
}

export interface TicketListResult {
  rows: TicketListRow[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Paginated, filtered ticket list for the dashboard (§7). Filters and search
 * are applied server-side; sorted newest-first. Search is a case-insensitive
 * "contains" across snapshot address, tenant name and description, plus an
 * exact reference match when the query is numeric.
 */
export async function listTickets(
  query: TicketListQuery,
): Promise<TicketListResult> {
  const where: Prisma.TicketWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.propertyId) where.propertyId = query.propertyId;

  if (query.q) {
    const q = query.q;
    const or: Prisma.TicketWhereInput[] = [
      { propertyAddressSnapshot: { contains: q, mode: "insensitive" } },
      { tenantName: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
    const asNumber = Number(q);
    if (Number.isInteger(asNumber)) or.push({ reference: asNumber });
    where.OR = or;
  }

  const page = Math.max(1, query.page);
  const [total, tickets] = await prisma.$transaction([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * TICKET_PAGE_SIZE,
      take: TICKET_PAGE_SIZE,
      select: {
        id: true,
        reference: true,
        createdAt: true,
        propertyAddressSnapshot: true,
        tenantName: true,
        category: true,
        status: true,
        photoKey: true,
      },
    }),
  ]);

  return {
    rows: tickets.map(({ photoKey, ...rest }) => ({
      ...rest,
      hasPhoto: photoKey !== null,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / TICKET_PAGE_SIZE)),
  };
}

/** Thrown when a ticket id does not exist (→ 404). */
export class TicketNotFoundError extends Error {
  constructor() {
    super("Ticket not found.");
    this.name = "TicketNotFoundError";
  }
}

export interface UpdateTicketInput {
  status?: StatusValue;
  internalNotes?: string | null;
}

/**
 * Update a ticket's status and/or internal notes (§8/§11). When the status
 * first transitions INTO RESOLVED (previousStatus !== RESOLVED), `resolvedAt`
 * is stamped — exactly the trigger that will fire Email 3 in M7. Re-toggling
 * does not re-stamp or (later) re-send. Email sending is deferred to M7.
 */
export async function updateTicket(
  id: string,
  input: UpdateTicketInput,
): Promise<{ id: string; status: StatusValue; justResolved: boolean }> {
  const existing = await prisma.ticket.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) throw new TicketNotFoundError();

  const justResolved =
    input.status === "RESOLVED" && existing.status !== "RESOLVED";

  const data: Prisma.TicketUpdateInput = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes;
  if (justResolved) data.resolvedAt = new Date();

  const updated = await prisma.ticket.update({
    where: { id },
    data,
    select: { id: true, status: true },
  });

  // NOTE(M7): if (justResolved) send Email 3 to the tenant — post-commit and
  // non-blocking. Deferred per the build order (§14).

  return { id: updated.id, status: updated.status, justResolved };
}

async function attachPhotoBestEffort(
  ticketId: string,
  photo: CreateTicketInput["photo"],
): Promise<void> {
  if (!photo) return;
  const key = `tickets/${ticketId}/${randomUUID()}.${photo.ext}`;
  try {
    await putObject({ key, body: photo.body, contentType: photo.contentType });
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { photoKey: key },
    });
  } catch (error) {
    // Storage not configured / transient failure — keep the ticket, drop photo.
    console.error(
      `[tickets] photo upload failed for ticket ${ticketId}; ticket kept without photo:`,
      error,
    );
  }
}
