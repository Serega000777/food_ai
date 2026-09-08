import { fromZonedTime } from "date-fns-tz";

export interface LocalDayRange {
  start: Date;
  end: Date;
}

/**
 * [start, end) in UTC for one local calendar day in the given IANA timezone — this is
 * what makes a meal logged near midnight land in the correct local diary day
 * (technical spec AT-009). Hand-rolling this with plain `Intl`/`Date` is exactly the
 * kind of DST/offset edge case that's easy to get subtly wrong (a sibling project hit a
 * real ICU/ariund-midnight bug this way) — `date-fns-tz` is a small, well-tested
 * dependency purpose-built for it.
 */
/** Validates an IANA timezone name without depending on `Intl.supportedValuesOf`
 * (a newer API not available in every runtime) — constructing a formatter with an
 * invalid zone throws, which is a good enough check for "safe to pass to
 * `fromZonedTime` later". */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function localDayRangeUtc(dateStr: string, timeZone: string): LocalDayRange {
  const start = fromZonedTime(`${dateStr}T00:00:00`, timeZone);

  const nextDate = new Date(`${dateStr}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextDateStr = nextDate.toISOString().slice(0, 10);
  const end = fromZonedTime(`${nextDateStr}T00:00:00`, timeZone);

  return { start, end };
}

/** `dateStr` +/- `days`, staying a plain calendar-date string — used to walk a
 * multi-day range (Progress's 7/30/90-day windows) one `localDayRangeUtc` call at a
 * time rather than re-deriving offsets from a `Date` in the wrong timezone. */
export function shiftDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Today" as a calendar-date string in the user's own timezone, not the server's
 * (AT-009's principle applied to a range endpoint, not just a single day). */
export function localTodayDateStr(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** The calendar-date string (in `timeZone`) that `date` falls on — used to bucket a
 * batch of UTC timestamps into local days without a per-row `localDayRangeUtc` query. */
export function toLocalDateStr(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}
