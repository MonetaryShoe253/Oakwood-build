import { afterEach, describe, expect, it, vi } from "vitest";

// The staff PATCH route reads DEMO_MODE at import time, so each test stubs the
// env, resets the module registry, and dynamically imports the route fresh.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock("@/auth");
  vi.doUnmock("@/lib/services/tickets");
});

function patchRequest(body: unknown): Request {
  return new Request("http://localhost/api/staff/tickets/t1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("staff endpoint auth (§6/§12)", () => {
  it("rejects an unauthenticated PATCH with 401 when demo mode is off", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.resetModules();
    vi.doMock("@/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));

    const { PATCH } = await import("@/app/api/staff/tickets/[id]/route");
    const res = await PATCH(patchRequest({ status: "NEW" }), {
      params: Promise.resolve({ id: "t1" }),
    });

    expect(res.status).toBe(401);
  });

  it("allows an unauthenticated PATCH in public-demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.resetModules();
    // Auth returns no session; the route must NOT gate on it in demo mode.
    vi.doMock("@/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
    vi.doMock("@/lib/services/tickets", () => ({
      updateTicket: vi
        .fn()
        .mockResolvedValue({ id: "t1", status: "IN_PROGRESS", justResolved: false }),
      TicketNotFoundError: class TicketNotFoundError extends Error {},
    }));

    const { PATCH } = await import("@/app/api/staff/tickets/[id]/route");
    const res = await PATCH(patchRequest({ status: "IN_PROGRESS" }), {
      params: Promise.resolve({ id: "t1" }),
    });

    expect(res.status).toBe(200);
  });
});
