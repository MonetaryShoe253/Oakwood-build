import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { createTicket, InvalidPropertyError } from "@/lib/services/tickets";
import {
  EXTENSION_BY_TYPE,
  ticketFormSchema,
  validatePhotoFile,
} from "@/lib/validation/ticket";

// Prisma + file handling require the Node.js runtime (not edge).
export const runtime = "nodejs";

/** Hidden anti-spam field; bots fill it, humans never see it (§5). */
const HONEYPOT_FIELD = "company";

type FieldErrors = Record<string, string>;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * POST /api/tickets — public ticket creation (build-spec §5/§11).
 * Validates (server-side, never trusting the client), stores an optional
 * photo, and creates the ticket. Emails (1 & 2) are wired in M7.
 *
 * NOTE: per-IP rate limiting (§5) is part of M8 hardening and not yet applied.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Per-IP rate limit (§5): 5/min, 30/hour → 429 with Retry-After.
  const rate = checkRateLimit(`tickets:${clientIp(request)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: rate.retryAfterSeconds
          ? { "Retry-After": String(rate.retryAfterSeconds) }
          : undefined,
      },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected multipart form data." },
      { status: 400 },
    );
  }

  // Honeypot: silently drop and fake success so bots get no signal.
  if (field(form, HONEYPOT_FIELD).trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const parsed = ticketFormSchema.safeParse({
    tenantName: field(form, "tenantName"),
    tenantEmail: field(form, "tenantEmail"),
    tenantPhone: field(form, "tenantPhone"),
    propertyId: field(form, "propertyId"),
    category: field(form, "category"),
    description: field(form, "description"),
  });

  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, fieldErrors }, { status: 400 });
  }

  // Optional photo — validate mime + size server-side (§12, don't trust client).
  let photo: Parameters<typeof createTicket>[0]["photo"];
  const photoEntry = form.get("photo");
  if (photoEntry instanceof File && photoEntry.size > 0) {
    const photoError = validatePhotoFile(photoEntry);
    if (photoError) {
      return NextResponse.json(
        { ok: false, fieldErrors: { photo: photoError } },
        { status: 400 },
      );
    }
    photo = {
      body: new Uint8Array(await photoEntry.arrayBuffer()),
      ext: EXTENSION_BY_TYPE[photoEntry.type],
      contentType: photoEntry.type,
    };
  }

  try {
    const ticket = await createTicket({ ...parsed.data, photo });
    return NextResponse.json({ ok: true, ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidPropertyError) {
      return NextResponse.json(
        { ok: false, fieldErrors: { propertyId: error.message } },
        { status: 400 },
      );
    }
    console.error("[api/tickets] failed to create ticket:", error);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
