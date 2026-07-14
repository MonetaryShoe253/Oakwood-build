// Oakwood Maintenance — database seed (build-spec §15).
//
// Seeds:
//   - 3 STAFF users (Mark Fletcher + two property managers), argon2id-hashed.
//   - ~80 properties (the production CSV is loaded here in real deployments;
//     this generates a representative set so the demo looks live).
//   - ~10 demo tickets spanning ALL 4 categories and ALL 4 statuses, a few
//     with photos and varied dates — for the showcase dashboard only.
//
// Idempotent: wipes tickets/properties and upserts users on each run, so it is
// safe to re-run. Per §15, do NOT seed tickets for the real client (clean
// start); the demo tickets below are showcase-only.
//
// The property/ticket dataset lives in src/lib/demo-seed-data.ts — the single
// source of truth shared with the in-app "reset demo data" action.
//
// Run with:  npm run db:seed   (requires DATABASE_URL)

import { PrismaClient, TicketStatus } from "@prisma/client";
import * as argon2 from "argon2";

// Imported by relative path so this standalone script needs no path-alias setup.
import {
  DEMO_PROPERTY_COUNT,
  DEMO_TICKETS,
  FIRST_REFERENCE,
  STAFF,
  buildAddresses,
  daysAgo,
} from "../src/lib/demo-seed-data";

const prisma = new PrismaClient();

// argon2id is mandated by the spec (§2/§6). Demo passwords come from the env
// in real seeding; a default is used here so the showcase instance is usable.
const SEED_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? "ChangeMe!2024";

async function main(): Promise<void> {
  console.log("Seeding Oakwood Maintenance database…");

  // --- Users (upsert so re-runs don't duplicate or churn ids) ---
  const passwordHash = await argon2.hash(SEED_PASSWORD, {
    type: argon2.argon2id,
  });

  for (const staff of STAFF) {
    await prisma.user.upsert({
      where: { email: staff.email },
      update: { name: staff.name, passwordHash },
      create: { name: staff.name, email: staff.email, passwordHash },
    });
  }
  console.log(`  Users:      ${STAFF.length} staff upserted`);

  // --- Properties (clean reseed) ---
  // Tickets reference properties, so clear tickets first to satisfy the FK.
  await prisma.ticket.deleteMany();
  await prisma.property.deleteMany();

  const addresses = buildAddresses(DEMO_PROPERTY_COUNT);
  await prisma.property.createMany({
    data: addresses.map((address) => ({ address })),
  });
  const properties = await prisma.property.findMany({
    where: { archived: false },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  Properties: ${properties.length} created`);

  // --- Demo tickets (showcase only — never for the real client, §15) ---
  let reference = FIRST_REFERENCE;
  for (let i = 0; i < DEMO_TICKETS.length; i += 1) {
    const t = DEMO_TICKETS[i];
    const property = properties[i % properties.length];
    const createdAt = daysAgo(t.ageDays);
    const isResolved = t.status === TicketStatus.RESOLVED;

    await prisma.ticket.create({
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
        photoKey: t.hasPhoto
          ? `tickets/demo-${reference}/photo.jpg`
          : null,
        status: t.status,
        internalNotes: t.internalNotes,
        createdAt,
        // resolvedAt is set only when the ticket is RESOLVED (§3/§10).
        resolvedAt: isResolved ? daysAgo(Math.max(t.ageDays - 2, 0)) : null,
      },
    });
    reference += 1;
  }
  console.log(
    `  Tickets:    ${DEMO_TICKETS.length} demo tickets created (#${FIRST_REFERENCE}–#${reference - 1})`,
  );

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
