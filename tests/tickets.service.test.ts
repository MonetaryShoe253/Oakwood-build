import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the data + transport layers so these run without a DB or email provider.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    property: { findUnique: vi.fn(), findMany: vi.fn() },
    ticket: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getActiveProperties } from "@/lib/services/properties";
import { createTicket, updateTicket } from "@/lib/services/tickets";

type Fn = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  property: { findUnique: Fn; findMany: Fn };
  ticket: { findFirst: Fn; create: Fn; findUnique: Fn; update: Fn };
  $transaction: Fn;
};
const email = vi.mocked(sendEmail);

beforeEach(() => {
  vi.clearAllMocks();
  email.mockResolvedValue({ sent: true });
});

describe("createTicket", () => {
  it("persists the ticket and fires both creation emails (§5/§10)", async () => {
    db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );
    db.property.findUnique.mockResolvedValue({
      address: "14 Elm Road, Flat 2",
      archived: false,
    });
    db.ticket.findFirst.mockResolvedValue(null); // no tickets yet → ref 1001
    db.ticket.create.mockResolvedValue({
      id: "t1",
      reference: 1001,
      propertyAddressSnapshot: "14 Elm Road, Flat 2",
    });

    const result = await createTicket({
      tenantName: "Sarah Collins",
      tenantEmail: "sarah@example.com",
      tenantPhone: "07700 900111",
      propertyId: "p1",
      category: "PLUMBING",
      description: "Kitchen sink is blocked.",
    });

    expect(result).toEqual({ id: "t1", reference: 1001 });

    // Reference starts at 1001 and the snapshot is copied from the property.
    expect(db.ticket.create).toHaveBeenCalledTimes(1);
    const createArg = db.ticket.create.mock.calls[0][0];
    expect(createArg.data.reference).toBe(1001);
    expect(createArg.data.propertyAddressSnapshot).toBe("14 Elm Road, Flat 2");
    expect(createArg.data.status).toBe("NEW");

    // Email 1 (team) + Email 2 (tenant).
    expect(email).toHaveBeenCalledTimes(2);
    const recipients = email.mock.calls.map((c) => c[0].to);
    expect(recipients).toContain("sarah@example.com");
    expect(recipients).toContain("maintenance@oakwoodpm.co.uk");
  });
});

describe("updateTicket resolution side effects (§10)", () => {
  const existing = {
    reference: 1001,
    category: "PLUMBING",
    tenantName: "Sarah Collins",
    tenantEmail: "sarah@example.com",
    description: "Kitchen sink is blocked.",
  };

  it("fires Email 3 once and stamps resolvedAt on first transition to RESOLVED", async () => {
    db.ticket.findUnique.mockResolvedValue({
      ...existing,
      status: "IN_PROGRESS",
    });
    db.ticket.update.mockResolvedValue({ id: "t1", status: "RESOLVED" });

    const result = await updateTicket("t1", { status: "RESOLVED" });

    expect(result.justResolved).toBe(true);
    expect(email).toHaveBeenCalledTimes(1);
    const updateArg = db.ticket.update.mock.calls[0][0];
    expect(updateArg.data.resolvedAt).toBeInstanceOf(Date);
  });

  it("does not re-send or re-stamp when already RESOLVED", async () => {
    db.ticket.findUnique.mockResolvedValue({ ...existing, status: "RESOLVED" });
    db.ticket.update.mockResolvedValue({ id: "t1", status: "RESOLVED" });

    const result = await updateTicket("t1", { status: "RESOLVED" });

    expect(result.justResolved).toBe(false);
    expect(email).not.toHaveBeenCalled();
    const updateArg = db.ticket.update.mock.calls[0][0];
    expect(updateArg.data.resolvedAt).toBeUndefined();
  });
});

describe("getActiveProperties (§9 dropdown)", () => {
  it("queries only non-archived properties (archived drop out of the dropdown)", async () => {
    db.property.findMany.mockResolvedValue([{ id: "p1", address: "X" }]);

    const props = await getActiveProperties();

    expect(props).toEqual([{ id: "p1", address: "X" }]);
    expect(db.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { archived: false } }),
    );
  });
});
