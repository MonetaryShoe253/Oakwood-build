import { TicketStatus } from "@prisma/client";

import {
  DEMO_PROPERTY_COUNT,
  DEMO_TICKETS,
  FIRST_REFERENCE,
  buildAddresses,
  daysAgo,
} from "@/lib/demo-seed-data";
import { prisma } from "@/lib/prisma";

export interface ResetResult {
  properties: number;
  tickets: number;
}

/**
 * Restore the demo database to its seed-based defaults (build-spec §15): wipe
 * all tickets and properties, recreate the ~80 showcase properties, and recreate
 * the 10 demo tickets (references restart at 1001). Staff users are left intact.
 *
 * Mirrors `prisma/seed.ts` via the shared dataset in `@/lib/demo-seed-data`, and
 * runs in one transaction so a partial failure leaves the DB unchanged. This is
 * a DEMO-ONLY operation — callers MUST confirm `DEMO_MODE` before invoking it.
 */
export async function resetDemoData(): Promise<ResetResult> {
  return prisma.$transaction(async (tx) => {
    // Tickets reference properties, so clear tickets first to satisfy the FK.
    await tx.ticket.deleteMany();
    await tx.property.deleteMany();

    const addresses = buildAddresses(DEMO_PROPERTY_COUNT);
    await tx.property.createMany({
      data: addresses.map((address) => ({ address })),
    });
    const properties = await tx.property.findMany({
      where: { archived: false },
      orderBy: { createdAt: "asc" },
    });

    let reference = FIRST_REFERENCE;
    for (let i = 0; i < DEMO_TICKETS.length; i += 1) {
      const t = DEMO_TICKETS[i];
      const property = properties[i % properties.length];
      const isResolved = t.status === TicketStatus.RESOLVED;

      await tx.ticket.create({
        data: {
          reference,
          propertyId: property.id,
          // Snapshot copied at submission — survives later archive/edit (§3).
          propertyAddressSnapshot: property.address,
          tenantName: t.tenantName,
          tenantEmail: t.tenantEmail,
          tenantPhone: t.tenantPhone,
          category: t.category,
          description: t.description,
          photoKey: t.hasPhoto ? `tickets/demo-${reference}/photo.jpg` : null,
          status: t.status,
          internalNotes: t.internalNotes,
          createdAt: daysAgo(t.ageDays),
          // resolvedAt is set only when the ticket is RESOLVED (§3/§10).
          resolvedAt: isResolved ? daysAgo(Math.max(t.ageDays - 2, 0)) : null,
        },
      });
      reference += 1;
    }

    return { properties: properties.length, tickets: DEMO_TICKETS.length };
  });
}
