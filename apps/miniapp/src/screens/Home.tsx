import type { DashboardResponse } from "@food-ai/contracts";
import { useEffect, useRef, useState } from "react";

import { getDashboard } from "../api/endpoints";
import { CalorieRing } from "../components/CalorieRing";
import { MacroBadges } from "../components/MacroBadges";
import { MealCard } from "../components/MealCard";
import { WeekStrip } from "../components/WeekStrip";
import { todayIso } from "../utils/date";

const DATE_HEADING_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function Home({
  initialDashboard,
  refreshKey,
}: {
  initialDashboard: DashboardResponse;
  refreshKey: number;
}) {
  const [date, setDate] = useState(todayIso());
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // `initialDashboard` already covers today's first paint — skip the redundant fetch.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLoading(true);
    void getDashboard(date).then((res) => {
      setDashboard(res);
      setLoading(false);
    });
  }, [date, refreshKey]);

  const heading =
    date === todayIso() ? "Сегодня" : DATE_HEADING_FORMATTER.format(new Date(`${date}T00:00:00Z`));

  return (
    <div className="screen">
      <WeekStrip selected={date} onSelect={setDate} />
      <p className="subtitle home-date-heading">{heading}</p>

      <div className="card home-summary-card" style={{ opacity: loading ? 0.6 : 1 }}>
        <CalorieRing consumed={dashboard.consumed.calories} target={dashboard.target.calories} />
        <MacroBadges
          proteinG={dashboard.consumed.proteinG}
          proteinTargetG={dashboard.target.proteinG}
          carbsG={dashboard.consumed.carbsG}
          carbsTargetG={dashboard.target.carbsG}
          fatG={dashboard.consumed.fatG}
          fatTargetG={dashboard.target.fatG}
        />
      </div>

      {/* Master prompt §13: all of the day's meals visible here, no "View All" hiding
          the diary — full editing (edit/delete) still lives in the Diary tab. */}
      {dashboard.meals.length === 0 ? (
        <div className="card">
          <p className="subtitle">
            {date === todayIso()
              ? "Сегодня ещё ничего не добавлено — нажми «+», чтобы начать."
              : "В этот день ничего не добавлено."}
          </p>
        </div>
      ) : (
        dashboard.meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
      )}

      <div className="spacer" />
    </div>
  );
}
