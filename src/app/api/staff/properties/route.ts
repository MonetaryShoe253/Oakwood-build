import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { DEMO_MODE } from "@/lib/demo";
import { createProperty, listProperties } from "@/lib/services/properties";
import { propertyCreateSchema } from "@/lib/validation/property";

export const runtime = "nodejs";

/** True unless a staff session is required and missing (public in demo mode). */
async function requireStaff(): Promise<boolean> {
  if (DEMO_MODE) return true;
  const session = await auth();
  return Boolean(session?.user);
}

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/** GET /api/staff/properties — list including archived flag (§11). */
export async function GET(): Promise<NextResponse> {
  if (!(await requireStaff())) return unauthorized();
  const properties = await listProperties(true);
  return NextResponse.json({ ok: true, properties });
}

/** POST /api/staff/properties — add { address } (§11). */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await requireStaff())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = propertyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const property = await createProperty(parsed.data.address);
  return NextResponse.json({ ok: true, property }, { status: 201 });
}
