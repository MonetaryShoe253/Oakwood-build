import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { PropertyUpdateValues } from "@/lib/validation/property";

export interface ActiveProperty {
  id: string;
  address: string;
}

export interface PropertyRecord {
  id: string;
  address: string;
  archived: boolean;
}

/**
 * Active (non-archived) properties for the tenant dropdown and filters
 * (build-spec §5/§9). Archived properties are never offered for new tickets.
 */
export async function getActiveProperties(): Promise<ActiveProperty[]> {
  return prisma.property.findMany({
    where: { archived: false },
    select: { id: true, address: true },
    orderBy: { address: "asc" },
  });
}

/**
 * Properties for the admin screen (§9). Active first, then (optionally)
 * archived. Archived rows are included only when `includeArchived` is set.
 */
export async function listProperties(
  includeArchived: boolean,
): Promise<PropertyRecord[]> {
  return prisma.property.findMany({
    where: includeArchived ? undefined : { archived: false },
    select: { id: true, address: true, archived: true },
    orderBy: [{ archived: "asc" }, { address: "asc" }],
  });
}

export async function createProperty(address: string): Promise<PropertyRecord> {
  return prisma.property.create({
    data: { address },
    select: { id: true, address: true, archived: true },
  });
}

/** Thrown when a property id does not exist (→ 404). */
export class PropertyNotFoundError extends Error {
  constructor() {
    super("Property not found.");
    this.name = "PropertyNotFoundError";
  }
}

/**
 * Update a property's address and/or archived state (§9). Editing the address
 * affects future submissions only — existing tickets keep their snapshot.
 * Archiving is a soft remove; the row (and its ticket FKs) are never deleted.
 */
export async function updateProperty(
  id: string,
  input: PropertyUpdateValues,
): Promise<PropertyRecord> {
  const data: Prisma.PropertyUpdateInput = {};
  if (input.address !== undefined) data.address = input.address;
  if (input.archived !== undefined) data.archived = input.archived;

  try {
    return await prisma.property.update({
      where: { id },
      data,
      select: { id: true, address: true, archived: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new PropertyNotFoundError();
    }
    throw error;
  }
}
