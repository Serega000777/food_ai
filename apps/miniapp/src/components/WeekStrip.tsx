import { useEffect, useMemo, useRef } from "react";

import { shiftDate, todayIso } from "../utils/date";

const DAYS_BEFORE_TODAY = 10;
const DAYS_AFTER_TODAY = 3;

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" });

/** Horizontally scrollable date strip (product blueprint reference: a week/calendar
 * row above the calorie ring). Window is fixed to real "today", not the selected
 * date, so the strip doesn't jump around as the user browses other days. */
export function WeekStrip({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (date: string) => void;
}) {
  const today = todayIso();
  const days = useMemo(() => {
    const arr: string[] = [];
    for (let i = -DAYS_BEFORE_TODAY; i <= DAYS_AFTER_TODAY; i++) arr.push(shiftDate(today, i));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current
      ?.querySelector<HTMLElement>(`[data-date="${selected}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest" });
    // Only on mount — re-centering on every selection would fight the user's own scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="week-strip" ref={scrollerRef}>
      {days.map((date) => {
        const d = new Date(`${date}T00:00:00Z`);
        return (
          <button
            key={date}
            data-date={date}
            className={`week-strip-day${date === selected ? " selected" : ""}${
              date === today ? " today" : ""
            }`}
            onClick={() => onSelect(date)}
          >
            <span className="week-strip-weekday">{WEEKDAY_FORMATTER.format(d)}</span>
            <span className="week-strip-daynum">{d.getUTCDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
