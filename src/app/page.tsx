import Link from "next/link";

import { ReportForm } from "@/components/report-form";
import { buttonVariants } from "@/components/ui/button";
import { DEMO_MODE } from "@/lib/demo";
import { getActiveProperties } from "@/lib/services/properties";

// Always read fresh property options (archives take effect immediately, §9).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const properties = await getActiveProperties();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {DEMO_MODE ? <DemoIntro /> : null}

      <header id="report-form" className="mb-8 scroll-mt-6">
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

/**
 * Portfolio framing shown only in public-demo mode. Explains, for a prospective
 * client, what this app is and points them straight at the staff dashboard —
 * where the real workflow (triage, status, notes, properties) lives.
 */
function DemoIntro() {
  return (
    <section className="mb-8 rounded-xl border border-input bg-muted/30 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Interactive demo
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">
        Oakwood — a maintenance workflow, end to end
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        An example of the kind of internal tool I build for teams: tenants report
        an issue with the form below, and staff triage, track, and resolve it from
        a shared dashboard — with the right people emailed automatically at each
        step. Everything here is live and editable, so try both sides.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href="/dashboard" className={buttonVariants({ size: "default" })}>
          View staff dashboard →
        </Link>
        <a
          href="#report-form"
          className={buttonVariants({ variant: "outline", size: "default" })}
        >
          Try the tenant form
        </a>
      </div>

      <ul className="mt-4 grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
        <li>• Public request form with photo upload</li>
        <li>• Filterable, searchable ticket dashboard</li>
        <li>• One-click status changes &amp; internal notes</li>
        <li>• Property management with soft-archive</li>
      </ul>
    </section>
  );
}
