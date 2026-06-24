export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="mb-5 h-24 w-full animate-pulse rounded-lg bg-muted" />
      <div className="space-y-2 rounded-lg border border-input p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    </main>
  );
}
