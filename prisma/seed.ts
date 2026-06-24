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
// Run with:  npm run db:seed   (requires DATABASE_URL)

import { PrismaClient, Category, TicketStatus } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

// First human-facing ticket reference. Monotonic, never reused (build-spec §3).
const FIRST_REFERENCE = 1001;

// argon2id is mandated by the spec (§2/§6). Demo passwords come from the env
// in real seeding; a default is used here so the showcase instance is usable.
const SEED_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? "ChangeMe!2024";

const STAFF: ReadonlyArray<{ name: string; email: string }> = [
  { name: "Mark Fletcher", email: "mark.fletcher@oakwoodpm.co.uk" },
  { name: "Priya Sharma", email: "priya.sharma@oakwoodpm.co.uk" },
  { name: "Tom Becker", email: "tom.becker@oakwoodpm.co.uk" },
];

// Building blocks for ~80 realistic UK lettings addresses.
const STREETS: ReadonlyArray<string> = [
  "Elm Road",
  "Maple Avenue",
  "Oakwood Lane",
  "Birch Close",
  "Cedar Grove",
  "Willow Street",
  "Chestnut Drive",
  "Sycamore Court",
  "Hawthorn Way",
  "Rowan Terrace",
  "Ashfield Road",
  "Beechwood Rise",
  "Holly Mews",
  "Juniper Place",
  "Linden Gardens",
  "Magnolia Walk",
];

const UNIT_PREFIXES: ReadonlyArray<string> = ["Flat", "Apartment", "Unit"];

function buildAddresses(count: number): string[] {
  const addresses: string[] = [];
  let i = 0;
  while (addresses.length < count) {
    const street = STREETS[i % STREETS.length];
    const houseNumber = ((i * 3) % 98) + 1;
    // Roughly half the stock is flats with a unit line, half are houses.
    if (i % 2 === 0) {
      const prefix = UNIT_PREFIXES[i % UNIT_PREFIXES.length];
      const unit = (i % 6) + 1;
      addresses.push(`${houseNumber} ${street}, ${prefix} ${unit}`);
    } else {
      addresses.push(`${houseNumber} ${street}`);
    }
    i += 1;
  }
  return addresses;
}

type DemoTicket = {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  category: Category;
  description: string;
  status: TicketStatus;
  hasPhoto: boolean;
  internalNotes: string | null;
  // Days before "now" the ticket was logged — drives varied, realistic dates.
  ageDays: number;
};

// 10 demo tickets: every category appears, every status appears (NEW x3,
// IN_PROGRESS x2, ASSIGNED_TO_CONTRACTOR x2, RESOLVED x3).
const DEMO_TICKETS: ReadonlyArray<DemoTicket> = [
  {
    tenantName: "Sarah Collins",
    tenantEmail: "sarah.collins@example.com",
    tenantPhone: "07700 900111",
    category: Category.PLUMBING,
    description:
      "Kitchen sink is blocked and water is draining very slowly. Started two days ago and is getting worse.",
    status: TicketStatus.NEW,
    hasPhoto: true,
    internalNotes: null,
    ageDays: 0,
  },
  {
    tenantName: "James Patel",
    tenantEmail: "james.patel@example.com",
    tenantPhone: "07700 900222",
    category: Category.ELECTRICAL,
    description:
      "The socket in the living room sparks when I plug anything in. I've stopped using it for now.",
    status: TicketStatus.NEW,
    hasPhoto: false,
    internalNotes: null,
    ageDays: 1,
  },
  {
    tenantName: "Emma Robinson",
    tenantEmail: "emma.robinson@example.com",
    tenantPhone: "07700 900333",
    category: Category.HEATING_BOILER,
    description:
      "No hot water since this morning. The boiler display is showing an F1 error code.",
    status: TicketStatus.NEW,
    hasPhoto: true,
    internalNotes: null,
    ageDays: 2,
  },
  {
    tenantName: "Daniel Okafor",
    tenantEmail: "daniel.okafor@example.com",
    tenantPhone: "07700 900444",
    category: Category.GENERAL,
    description:
      "The front door lock is stiff and sometimes won't turn. Worried about being locked out.",
    status: TicketStatus.IN_PROGRESS,
    hasPhoto: false,
    internalNotes: "Called tenant, arranging a locksmith visit this week.",
    ageDays: 4,
  },
  {
    tenantName: "Lucy Thompson",
    tenantEmail: "lucy.thompson@example.com",
    tenantPhone: "07700 900555",
    category: Category.PLUMBING,
    description:
      "Bathroom tap is dripping constantly and the washer looks worn. Wasting a lot of water.",
    status: TicketStatus.IN_PROGRESS,
    hasPhoto: true,
    internalNotes: "Parts ordered; plumber booked for Thursday morning.",
    ageDays: 5,
  },
  {
    tenantName: "Michael Adams",
    tenantEmail: "michael.adams@example.com",
    tenantPhone: "07700 900666",
    category: Category.ELECTRICAL,
    description:
      "Hallway lights keep flickering and one has stopped working entirely.",
    status: TicketStatus.ASSIGNED_TO_CONTRACTOR,
    hasPhoto: false,
    internalNotes: "Assigned to Bright Spark Electrical — visit booked Friday.",
    ageDays: 7,
  },
  {
    tenantName: "Aisha Khan",
    tenantEmail: "aisha.khan@example.com",
    tenantPhone: "07700 900777",
    category: Category.HEATING_BOILER,
    description:
      "Radiators in the bedrooms are cold even with the heating on full. Living room is fine.",
    status: TicketStatus.ASSIGNED_TO_CONTRACTOR,
    hasPhoto: true,
    internalNotes: "Heating engineer assigned; likely needs bleeding/balancing.",
    ageDays: 9,
  },
  {
    tenantName: "George Wright",
    tenantEmail: "george.wright@example.com",
    tenantPhone: "07700 900888",
    category: Category.GENERAL,
    description:
      "There's a small damp patch appearing on the ceiling in the spare room.",
    status: TicketStatus.RESOLVED,
    hasPhoto: true,
    internalNotes: "Leak from flat above traced and fixed; ceiling redecorated.",
    ageDays: 14,
  },
  {
    tenantName: "Nadia Hassan",
    tenantEmail: "nadia.hassan@example.com",
    tenantPhone: "07700 900999",
    category: Category.PLUMBING,
    description:
      "Toilet wouldn't stop running after flushing. Could hear water trickling overnight.",
    status: TicketStatus.RESOLVED,
    hasPhoto: false,
    internalNotes: "Replaced the fill valve; tested and working.",
    ageDays: 21,
  },
  {
    tenantName: "Oliver Bennett",
    tenantEmail: "oliver.bennett@example.com",
    tenantPhone: "07700 901000",
    category: Category.ELECTRICAL,
    description:
      "The extractor fan in the kitchen has stopped working completely.",
    status: TicketStatus.RESOLVED,
    hasPhoto: false,
    internalNotes: "Faulty motor replaced; fan running normally.",
    ageDays: 30,
  },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

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

  const addresses = buildAddresses(80);
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
