import {
  isValidTimeZone,
  localDayRangeUtc,
  localTodayDateStr,
  shiftDateStr,
  toLocalDateStr,
} from "./local-day";

describe("isValidTimeZone", () => {
  it("accepts a real IANA zone", () => {
    expect(isValidTimeZone("Europe/Moscow")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidTimeZone("Not/A_Zone")).toBe(false);
  });
});

describe("localDayRangeUtc", () => {
  it("computes UTC bounds for a local day in a positive-offset timezone", () => {
    // Europe/Moscow is UTC+3 (no DST) — local midnight 2026-03-05 is 2026-03-04T21:00Z.
    const { start, end } = localDayRangeUtc("2026-03-05", "Europe/Moscow");
    expect(start.toISOString()).toBe("2026-03-04T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-05T21:00:00.000Z");
  });

  it("AT-009: a meal at 23:50 local time falls inside that local day, not the next", () => {
    const { start, end } = localDayRangeUtc("2026-03-05", "Europe/Moscow");
    const mealAt2350Local = new Date("2026-03-05T20:50:00.000Z"); // 23:50 MSK
    expect(mealAt2350Local >= start && mealAt2350Local < end).toBe(true);
  });

  it("AT-009: a meal at 00:10 local time falls inside the new day, not the previous one", () => {
    const { start: mar5Start } = localDayRangeUtc("2026-03-05", "Europe/Moscow");
    const { start: mar6Start, end: mar6End } = localDayRangeUtc("2026-03-06", "Europe/Moscow");
    const mealAt0010Local = new Date("2026-03-05T21:10:00.000Z"); // 00:10 MSK on the 6th

    expect(mealAt0010Local >= mar6Start && mealAt0010Local < mar6End).toBe(true);
    expect(mealAt0010Local >= mar5Start).toBe(true); // sanity: it's after the 5th started too
  });

  it("handles a negative-offset timezone crossing the UTC date line", () => {
    // America/New_York is UTC-5 in March (EST) — local midnight is 05:00 UTC same date.
    const { start, end } = localDayRangeUtc("2026-03-05", "America/New_York");
    expect(start.toISOString()).toBe("2026-03-05T05:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-06T05:00:00.000Z");
  });

  it("produces a 24-hour range across a plain (non-DST-transition) day", () => {
    const { start, end } = localDayRangeUtc("2026-06-15", "Europe/Moscow");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("shiftDateStr", () => {
  it("moves forward across a month boundary", () => {
    expect(shiftDateStr("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("moves backward across a year boundary", () => {
    expect(shiftDateStr("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("toLocalDateStr / localTodayDateStr", () => {
  it("buckets a UTC instant into the correct local calendar day (positive offset)", () => {
    // 00:10 MSK on the 6th is still 2026-03-05 in UTC.
    const mealAt0010Local = new Date("2026-03-05T21:10:00.000Z");
    expect(toLocalDateStr(mealAt0010Local, "Europe/Moscow")).toBe("2026-03-06");
  });

  it("localTodayDateStr matches toLocalDateStr(now, tz)", () => {
    const now = new Date();
    expect(localTodayDateStr("Europe/Moscow")).toBe(toLocalDateStr(now, "Europe/Moscow"));
  });
});
