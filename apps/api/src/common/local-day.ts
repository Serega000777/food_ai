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
