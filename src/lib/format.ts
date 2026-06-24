const RELATIVE = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

const DIVISIONS: ReadonlyArray<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> =
  [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ];

/** Human relative time, e.g. "2 days ago" (build-spec §7 "Logged" column). */
export function relativeTime(date: Date): string {
  let duration = (date.getTime() - Date.now()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return RELATIVE.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return RELATIVE.format(Math.round(duration), "year");
}

const EXACT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Exact timestamp for tooltips / hover (§7). */
export function exactTime(date: Date): string {
  return EXACT.format(date);
}
