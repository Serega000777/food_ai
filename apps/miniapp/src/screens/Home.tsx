import type { DashboardResponse } from "@food-ai/contracts";

const MEAL_TYPE_LABEL: Record<string, string> = {
  BREAKFAST: "Завтрак",
  LUNCH: "Обед",
  DINNER: "Ужин",
  SNACK: "Перекус",
  OTHER: "Другое",
};

function MacroBar({ label, value, target }: { label: string; value: number; target: number }) {
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="macro-item">
      <div className="label">{label}</div>
      <div className="value">
        {value}/{target} г
      </div>
      <div className="progress-bar">
        <div style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function Home({ dashboard }: { dashboard: DashboardResponse }) {
  const remaining = Math.max(0, Math.round(dashboard.remaining.calories));

  return (
    <div className="screen">
      <p className="subtitle">Сегодня</p>

      <div className="card" style={{ textAlign: "center" }}>
        <div className="big-number">{Math.round(dashboard.consumed.calories)}</div>
        <p className="subtitle">
          из {Math.round(dashboard.target.calories)} ккал · осталось {remaining}
        </p>

        <div className="macro-row">
          <MacroBar
            label="Белки"
            value={Math.round(dashboard.consumed.proteinG)}
            target={Math.round(dashboard.target.proteinG)}
          />
          <MacroBar
            label="Жиры"
            value={Math.round(dashboard.consumed.fatG)}
            target={Math.round(dashboard.target.fatG)}
          />
          <MacroBar
            label="Углеводы"
            value={Math.round(dashboard.consumed.carbsG)}
            target={Math.round(dashboard.target.carbsG)}
          />
        </div>
      </div>

      {/* Master prompt §13: all of today's meals visible here, no "View All" hiding
          the diary — full editing (edit/delete) still lives in the Diary tab. */}
      {dashboard.meals.length === 0 ? (
        <div className="card">
          <p className="subtitle">Сегодня ещё ничего не добавлено — нажми «+», чтобы начать.</p>
        </div>
      ) : (
        dashboard.meals.map((meal) => (
          <div key={meal.id} className="card">
            <div className="meal-card-header">
              <strong>{MEAL_TYPE_LABEL[meal.mealType] ?? meal.mealType}</strong>
              <span>{Math.round(meal.totalCalories)} ккал</span>
            </div>
            {meal.items.map((item) => (
              <div key={item.id} className="subtitle">
                {item.displayName} · {Math.round(item.grams)} г
              </div>
            ))}
          </div>
        ))
      )}

      <div className="spacer" />
    </div>
  );
}
