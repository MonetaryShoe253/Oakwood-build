import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  TicketNotFoundError,
  updateTicket,
} from "@/lib/services/tickets";
import { ticketUpdateSchema } from "@/lib/validation/ticket";

export const runtime = "nodejs";

/**
 * PATCH /api/staff/tickets/[id] — update status and/or internal notes (§11).
 * Per-handler session check (defence in depth alongside middleware, §6/§12).
 */
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

  const parsed = ticketUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const result = await updateTicket(id, parsed.data);
    return NextResponse.json({ ok: true, status: result.status });
  } catch (error) {
    if (error instanceof TicketNotFoundError) {
      return NextResponse.json(
        { ok: false, error: "Ticket not found." },
        { status: 404 },
      );
    }
    console.error("[api/staff/tickets] update failed:", error);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
