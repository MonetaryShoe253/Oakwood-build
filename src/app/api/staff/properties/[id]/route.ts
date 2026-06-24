import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  PropertyNotFoundError,
  updateProperty,
} from "@/lib/services/properties";
import { propertyUpdateSchema } from "@/lib/validation/property";

export const runtime = "nodejs";

/** PATCH /api/staff/properties/[id] — archive/un-archive/edit (§11). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = propertyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const property = await updateProperty(id, parsed.data);
    return NextResponse.json({ ok: true, property });
  } catch (error) {
    if (error instanceof PropertyNotFoundError) {
      return NextResponse.json(
        { ok: false, error: "Property not found." },
        { status: 404 },
      );
    }
    console.error("[api/staff/properties] update failed:", error);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
