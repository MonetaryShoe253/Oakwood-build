import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AddPropertyForm } from "@/components/add-property-form";
import { DemoBanner } from "@/components/demo-banner";
import { PropertyItem } from "@/components/property-item";
import { buttonVariants } from "@/components/ui/button";
import { DEMO_MODE } from "@/lib/demo";
import { listProperties } from "@/lib/services/properties";

export const dynamic = "force-dynamic";
export const metadata = { title: "Properties — Oakwood Maintenance" };

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ showArchived?: string }>;
}) {
  const session = await auth();
  if (!DEMO_MODE && !session?.user) redirect("/login");

  const { showArchived } = await searchParams;
  const includeArchived = showArchived === "1";
  const properties = await listProperties(includeArchived);

  return (
    <>
      {DEMO_MODE ? <DemoBanner /> : null}
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground">
            Manage the addresses tenants can choose when reporting an issue.
          </p>
        </div>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Back to dashboard
        </Link>
      </header>

      <div className="mb-5">
        <AddPropertyForm />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {properties.length} {includeArchived ? "total" : "active"}
        </span>
        <Link
          href={includeArchived ? "/properties" : "/properties?showArchived=1"}
          className="text-sm underline-offset-2 hover:underline"
        >
          {includeArchived ? "Hide archived" : "Show archived"}
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-lg border border-dashed border-input p-12 text-center text-sm text-muted-foreground">
          No properties yet. Add one above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-input">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {properties.map((property) => (
                <PropertyItem key={property.id} property={property} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      </main>
    </>
  );
}
