import { describe, expect, it } from "vitest";

import { ticketListQuerySchema } from "@/lib/validation/ticket";

// Regression: the dashboard GET form submits every filter field, so unused ones
// arrive as "". Those blanks must be treated as "no filter" — not as invalid
// values that fail parsing and wipe out the filters the user actually set.
describe("ticketListQuerySchema (dashboard filters, §7)", () => {
  it("treats blank filter values as absent", () => {
    const parsed = ticketListQuerySchema.safeParse({
      status: "",
      propertyId: "",
      q: "",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.status).toBeUndefined();
    expect(parsed.data.propertyId).toBeUndefined();
    expect(parsed.data.q).toBeUndefined();
    expect(parsed.data.page).toBe(1);
  });

  it("keeps a real status when other fields are blank", () => {
    const parsed = ticketListQuerySchema.safeParse({
      status: "IN_PROGRESS",
      propertyId: "",
      q: "",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.status).toBe("IN_PROGRESS");
    expect(parsed.data.propertyId).toBeUndefined();
  });

  it("still rejects an unknown status value", () => {
    const parsed = ticketListQuerySchema.safeParse({ status: "BOGUS" });
    expect(parsed.success).toBe(false);
  });
});
