import type { DiaryResponse } from "@food-ai/contracts";
import { useEffect, useState } from "react";

import { deleteMeal, getDiary } from "../api/endpoints";
import { MealCard } from "../components/MealCard";
import { shiftDate, todayIso } from "../utils/date";

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
          <MealCard key={meal.id} meal={meal} onDelete={() => void handleDelete(meal.id)} />
        ))}
    </div>
  );
}
