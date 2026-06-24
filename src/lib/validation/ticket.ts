import { z } from "zod";

/**
 * Shared ticket-create validation (build-spec §5). Used on BOTH the client
 * form and the server route — never trust the client (§12).
 *
 * Category values mirror the Prisma `Category` enum (§3/§4) but are declared
 * here as a local tuple so this module stays free of `@prisma/client`, which
 * must not be bundled into the client component.
 */

export const CATEGORY_VALUES = [
  "PLUMBING",
  "ELECTRICAL",
  "HEATING_BOILER",
  "GENERAL",
] as const;

export type CategoryValue = (typeof CATEGORY_VALUES)[number];

/** Display label → machine value, per §4 (do not paraphrase). */
export const CATEGORY_OPTIONS: ReadonlyArray<{
  value: CategoryValue;
  label: string;
}> = [
  { value: "PLUMBING", label: "Plumbing" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "HEATING_BOILER", label: "Heating / Boiler" },
  { value: "GENERAL", label: "General" },
];

export function categoryLabel(value: CategoryValue): string {
  return CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Mirrors the Prisma `TicketStatus` enum (§3/§4); kept prisma-free for the client. */
export const STATUS_VALUES = [
  "NEW",
  "IN_PROGRESS",
  "ASSIGNED_TO_CONTRACTOR",
  "RESOLVED",
] as const;

export type StatusValue = (typeof STATUS_VALUES)[number];

/** Display label → machine value, per §4 (do not paraphrase). */
export const STATUS_OPTIONS: ReadonlyArray<{
  value: StatusValue;
  label: string;
}> = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ASSIGNED_TO_CONTRACTOR", label: "Assigned to Contractor" },
  { value: "RESOLVED", label: "Resolved" },
];

export function statusLabel(value: StatusValue): string {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

// File rules (§5/§12): single JPEG/PNG, ≤10 MB. Enforced server-side too.
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
export const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Phone: digits, spaces, and + - ( ) only; 7–20 chars (§5).
const PHONE_REGEX = /^[0-9+\-()\s]+$/;

/** Text/select fields of the public form. The photo is validated separately. */
export const ticketFormSchema = z.object({
  tenantName: z
    .string()
    .trim()
    .min(2, "Please enter your name (at least 2 characters).")
    .max(100, "Name must be 100 characters or fewer."),
  tenantEmail: z
    .email("Please enter a valid email address.")
    .max(200, "Email must be 200 characters or fewer."),
  tenantPhone: z
    .string()
    .trim()
    .min(7, "Please enter a contact phone number (at least 7 characters).")
    .max(20, "Phone number must be 20 characters or fewer.")
    .regex(PHONE_REGEX, "Phone may only contain digits, spaces and + - ( )."),
  propertyId: z.string().min(1, "Please select your property."),
  category: z.enum(CATEGORY_VALUES, {
    message: "Please choose a category.",
  }),
  description: z
    .string()
    .trim()
    .min(5, "Please describe the issue (at least 5 characters).")
    .max(2000, "Description must be 2000 characters or fewer."),
});

export type TicketFormValues = z.infer<typeof ticketFormSchema>;

/**
 * Staff ticket update (build-spec §8/§11): change status and/or internal notes.
 * At least one field must be present.
 */
export const ticketUpdateSchema = z
  .object({
    status: z.enum(STATUS_VALUES).optional(),
    internalNotes: z
      .string()
      .max(10000, "Internal notes are too long.")
      .nullable()
      .optional(),
  })
  .refine((data) => data.status !== undefined || data.internalNotes !== undefined, {
    message: "Provide a status and/or internal notes to update.",
  });

export type TicketUpdateValues = z.infer<typeof ticketUpdateSchema>;

/** Dashboard list query params (§7/§11). All optional. */
export const ticketListQuerySchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  propertyId: z.string().min(1).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

/**
 * Validate an uploaded photo (optional). Works with any `File`/`Blob`-like
 * value exposing `size` and `type`. Returns an error message or null if valid.
 */
export function validatePhotoFile(
  file: { size: number; type: string } | null | undefined,
): string | null {
  if (!file || file.size === 0) return null; // optional
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return "Photo must be a JPEG or PNG image.";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Photo must be 10 MB or smaller.";
  }
  return null;
}
