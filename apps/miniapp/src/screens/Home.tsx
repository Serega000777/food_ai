import type { DashboardResponse } from "@food-ai/contracts";

import { CalorieRing } from "../components/CalorieRing";
import { MacroBadges } from "../components/MacroBadges";
import { MealCard } from "../components/MealCard";

export function Home({ dashboard }: { dashboard: DashboardResponse }) {
  return (
    <div className="screen">
      <p className="subtitle">Сегодня</p>

      <div className="card home-summary-card">
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

      {/* Master prompt §13: all of today's meals visible here, no "View All" hiding
          the diary — full editing (edit/delete) still lives in the Diary tab. */}
      {dashboard.meals.length === 0 ? (
        <div className="card">
          <p className="subtitle">Сегодня ещё ничего не добавлено — нажми «+», чтобы начать.</p>
        </div>
      ) : (
        dashboard.meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
      )}

      <div className="spacer" />
    </div>
  );
}
