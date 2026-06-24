import { describe, expect, it, vi } from "vitest";

// No session → guard must reject. Mock auth + the data/transport deps the
// route module pulls in so importing it has no side effects.
vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { PATCH } from "@/app/api/staff/tickets/[id]/route";

describe("staff endpoint auth (§6/§12)", () => {
  it("rejects an unauthenticated PATCH with 401", async () => {
    const req = new Request("http://localhost/api/staff/tickets/t1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "NEW" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "t1" }) });

    expect(res.status).toBe(401);
  });
});
