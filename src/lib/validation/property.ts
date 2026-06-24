import { z } from "zod";

/** Property address rules (build-spec §9 — "the full line", one per row). */
const address = z
  .string()
  .trim()
  .min(3, "Please enter the full property address.")
  .max(200, "Address must be 200 characters or fewer.");

export const propertyCreateSchema = z.object({ address });

export type PropertyCreateValues = z.infer<typeof propertyCreateSchema>;

/** Archive / un-archive and/or edit the address (§9). At least one field. */
export const propertyUpdateSchema = z
  .object({
    address: address.optional(),
    archived: z.boolean().optional(),
  })
  .refine(
    (data) => data.address !== undefined || data.archived !== undefined,
    { message: "Provide an address and/or archived state to update." },
  );

export type PropertyUpdateValues = z.infer<typeof propertyUpdateSchema>;
