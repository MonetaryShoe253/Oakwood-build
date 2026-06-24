import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { StatusSelect } from "@/components/status-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { logout } from "@/lib/actions/auth";
import { exactTime, relativeTime } from "@/lib/format";
import { getActiveProperties } from "@/lib/services/properties";
import { listTickets } from "@/lib/services/tickets";
import {
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  categoryLabel,
  statusLabel,
  ticketListQuerySchema,
  type CategoryValue,
  type StatusValue,
} from "@/lib/validation/ticket";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Oakwood Maintenance" };

type RawParams = Record<string, string | string[] | undefined>;

function buildHref(
  query: { status?: StatusValue; propertyId?: string; q?: string },
  page: number,
): string {
  const sp = new URLSearchParams();
  if (query.status) sp.set("status", query.status);
  if (query.propertyId) sp.set("propertyId", query.propertyId);
  if (query.q) sp.set("q", query.q);
  sp.set("page", String(page));
  return `/dashboard?${sp.toString()}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const raw = await searchParams;
  const parsed = ticketListQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : ticketListQuerySchema.parse({});

  const [result, properties] = await Promise.all([
    listTickets(query),
    getActiveProperties(),
  ]);

  const filtersActive = Boolean(query.status || query.propertyId || query.q);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Maintenance tickets
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {session.user.name ?? session.user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/properties"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Properties
          </Link>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {/* Filters — applied server-side via GET (build-spec §7). */}
      <form
        method="get"
        className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-input p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Ref, name, address, text…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status" defaultValue={query.status ?? ""}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="propertyId">Property</Label>
          <NativeSelect
            id="propertyId"
            name="propertyId"
            defaultValue={query.propertyId ?? ""}
          >
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">Apply</Button>
          {filtersActive ? (
            <Link href="/dashboard" className={buttonVariants({ variant: "ghost" })}>
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {result.total === 0 ? (
        <EmptyState filtersActive={filtersActive} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-input">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Ref</th>
                  <th className="px-4 py-3 font-medium">Logged</th>
                  <th className="px-4 py-3 font-medium">Property / tenant</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <Link
                        href={`/tickets/${row.id}`}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        #{row.reference}
                      </Link>
                      {row.hasPhoto ? (
                        <span className="ml-1" title="Photo attached" aria-label="Photo attached">
                          📷
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-muted-foreground">
                      <span title={exactTime(row.createdAt)}>
                        {relativeTime(row.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">
                        {row.propertyAddressSnapshot}
                      </div>
                      <div className="text-muted-foreground">
                        {row.tenantName}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {categoryLabel(row.category as CategoryValue)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusSelect
                        ticketId={row.id}
                        initialStatus={row.status as StatusValue}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav
            className="mt-4 flex items-center justify-between text-sm"
            aria-label="Pagination"
          >
            <span className="text-muted-foreground">
              {result.total} ticket{result.total === 1 ? "" : "s"} · page{" "}
              {result.page} of {result.pageCount}
            </span>
            <div className="flex gap-2">
              <PagerLink
                href={buildHref(query, result.page - 1)}
                disabled={result.page <= 1}
                label="Previous"
              />
              <PagerLink
                href={buildHref(query, result.page + 1)}
                disabled={result.page >= result.pageCount}
                label="Next"
              />
            </div>
          </nav>
        </>
      )}
    </main>
  );
}

function EmptyState({ filtersActive }: { filtersActive: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-input p-12 text-center">
      <p className="text-sm font-medium">
        {filtersActive ? "No tickets match these filters" : "No tickets yet"}
      </p>
      {filtersActive ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting or clearing your filters.
        </p>
      ) : null}
    </div>
  );
}

function PagerLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 cursor-not-allowed items-center rounded-md border border-input px-3 text-muted-foreground opacity-50">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      {label}
    </Link>
  );
}
