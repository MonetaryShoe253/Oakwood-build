import { ReportForm } from "@/components/report-form";
import { getActiveProperties } from "@/lib/services/properties";

// Always read fresh property options (archives take effect immediately, §9).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const properties = await getActiveProperties();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Report a maintenance issue
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Oakwood Property Management. Tell us what needs fixing and we&apos;ll
          get back to you — no account needed.
        </p>
      </header>

      {properties.length === 0 ? (
        <p className="rounded-md border border-input bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          The request form isn&apos;t available right now. Please contact
          Oakwood Property Management directly.
        </p>
      ) : (
        <ReportForm properties={properties} />
      )}
    </main>
  );
}
