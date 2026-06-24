import { prisma } from "@/lib/prisma";

export interface ActiveProperty {
  id: string;
  address: string;
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
