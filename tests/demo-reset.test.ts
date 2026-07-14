import { afterEach, describe, expect, it, vi } from "vitest";

// The reset route reads DEMO_MODE at import time; stub env + reset modules per
// test and dynamically import so each case gets the flag it needs.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock("@/lib/services/demo-reset");
});

describe("demo reset endpoint (§15, demo-only)", () => {
  it("404s and never touches data when demo mode is off", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.resetModules();
    const reset = vi.fn();
    vi.doMock("@/lib/services/demo-reset", () => ({ resetDemoData: reset }));

    const { POST } = await import("@/app/api/staff/reset/route");
    const res = await POST();

    expect(res.status).toBe(404);
    expect(reset).not.toHaveBeenCalled();
  });

  it("resets and returns seed counts in demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.resetModules();
    vi.doMock("@/lib/services/demo-reset", () => ({
      resetDemoData: vi.fn().mockResolvedValue({ properties: 80, tickets: 10 }),
    }));

    const { POST } = await import("@/app/api/staff/reset/route");
    const res = await POST();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      properties: 80,
      tickets: 10,
    });
  });
});
