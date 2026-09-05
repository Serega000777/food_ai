import type { DiaryResponse } from "@food-ai/contracts";
import { useEffect, useState } from "react";

import { deleteMeal, getDiary } from "../api/endpoints";

const MEAL_TYPE_LABEL: Record<string, string> = {
  BREAKFAST: "Завтрак",
  LUNCH: "Обед",
  DINNER: "Ужин",
  SNACK: "Перекус",
  OTHER: "Другое",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function Diary({ onChanged }: { onChanged: () => void }) {
  const [date, setDate] = useState(todayIso());
  const [diary, setDiary] = useState<DiaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(targetDate: string) {
    setLoading(true);
    setDiary(await getDiary(targetDate));
    setLoading(false);
  }

  useEffect(() => {
    void load(date);
  }, [date]);

  async function handleDelete(id: string) {
    await deleteMeal(id);
    await load(date);
    onChanged();
  }

  return (
    <div className="screen">
      <div className="date-nav">
        <button className="back-link" onClick={() => setDate(shiftDate(date, -1))}>
          ←
        </button>
        <p className="subtitle">{date}</p>
        <button className="back-link" onClick={() => setDate(shiftDate(date, 1))}>
          →
        </button>
      </div>

      {loading && <p className="subtitle">Загрузка...</p>}
      {!loading && diary?.meals.length === 0 && (
        <p className="subtitle">В этот день пока ничего не добавлено.</p>
      )}
      {!loading &&
        diary?.meals.map((meal) => (
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
            <button className="back-link" onClick={() => void handleDelete(meal.id)}>
              Удалить
            </button>
          </div>
        ))}
    </div>
  );
}
