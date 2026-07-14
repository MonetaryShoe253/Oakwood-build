import Link from "next/link";

/**
 * Thin banner shown across the staff area in public-demo mode. Sets the
 * expectation that this is a live, editable portfolio demo — not a real
 * tenant's data — so visitors feel free to click into every feature.
 */
export function DemoBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-sm sm:px-6">
        <span aria-hidden className="font-semibold">
          Live demo
        </span>
        <span className="text-amber-900/80 dark:text-amber-100/80">
          This staff dashboard is open on purpose — explore and edit anything.
          Changes are shared with other visitors and no real emails are sent.
        </span>
        <Link
          href="/"
          className="ml-auto whitespace-nowrap font-medium underline underline-offset-2 hover:no-underline"
        >
          ← Tenant request form
        </Link>
      </div>
    </div>
  );
}
