import { NextResponse } from "next/server";

import { DEMO_MODE } from "@/lib/demo";
import { resetDemoData } from "@/lib/services/demo-reset";

export const runtime = "nodejs";

/**
 * POST /api/staff/reset — restore the demo database to its seed defaults.
 *
 * DEMO-ONLY: this wipes every ticket and property, so it is available solely in
 * public-demo mode. With DEMO_MODE off it 404s and never touches data, ensuring
 * a real deployment can never be reset through the UI.
 */
export async function POST(): Promise<NextResponse> {
  if (!DEMO_MODE) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await resetDemoData();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[api/staff/reset] reset failed:", error);
    return NextResponse.json(
      { ok: false, error: "Reset failed. Please try again." },
      { status: 500 },
    );
  }
}
