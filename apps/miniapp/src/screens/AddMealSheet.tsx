import type { Food, MealType, RecentMealDto } from "@food-ai/contracts";
import { useEffect, useState } from "react";

import { createMeal, getRecentMeals, repeatMeal, searchFoods } from "../api/endpoints";

import { PhotoMealFlow } from "./PhotoMealFlow";

const MEAL_TYPE_OPTIONS: Array<{ value: MealType; label: string }> = [
  { value: "BREAKFAST", label: "Завтрак" },
  { value: "LUNCH", label: "Обед" },
  { value: "DINNER", label: "Ужин" },
  { value: "SNACK", label: "Перекус" },
  { value: "OTHER", label: "Другое" },
];

const SEARCH_DEBOUNCE_MS = 250;

type Mode = "choose" | "search" | "photo" | "recent";

/** Repeat flow (master prompt §19/§14, US-009): pick a past meal, confirm in one tap —
 * never auto-logs, the tap itself is the confirmation. */
function RecentMealsFlow({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [meals, setMeals] = useState<RecentMealDto[] | null>(null);
  const [repeatingId, setRepeatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecentMeals()
      .then(setMeals)
      .catch(() => setMeals([]));
  }, []);

  async function handleRepeat(sourceMealId: string) {
    setRepeatingId(sourceMealId);
    setError(null);
    try {
      await repeatMeal({ sourceMealId });
      onAdded();
    } catch {
      setError("Не получилось повторить приём пищи.");
      setRepeatingId(null);
    }
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <p className="title">Недавние приёмы пищи</p>

        {meals === null && <p className="subtitle">Загрузка...</p>}
        {meals?.length === 0 && (
          <p className="subtitle">
            Пока нет истории — добавь первый приём пищи вручную или по фото.
          </p>
        )}
        <div className="option-list">
          {meals?.map((meal) => (
            <button
              key={meal.id}
              className="option-card"
              disabled={repeatingId !== null}
              onClick={() => void handleRepeat(meal.id)}
            >
              <strong>{meal.items.map((item) => item.displayName).join(", ")}</strong>
              <div className="subtitle">
                {Math.round(meal.totalCalories)} ккал
                {meal.timesEaten > 1 ? ` · ${meal.timesEaten} раз` : ""}
                {repeatingId === meal.id ? " · повторяем..." : ""}
              </div>
            </button>
          ))}
        </div>

        {error && <p className="error-text">{error}</p>}
        <button className="back-link" onClick={onClose}>
          Отмена
        </button>
      </div>
    </div>
  );
}

function SearchMealFlow({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState<MealType>("SNACK");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchFoods(query)
        .then(setResults)
        .catch(() => setResults([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      await createMeal({ mealType, items: [{ foodId: selected.id, grams }] });
      onAdded();
    } catch {
      setError("Не получилось добавить. Попробуй ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <p className="title">Найти продукт</p>

        {!selected ? (
          <>
            <input
              className="search-input"
              placeholder="Найти продукт..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="search-results">
              {results.map((food) => (
                <button key={food.id} className="option-card" onClick={() => setSelected(food)}>
                  {food.canonicalName} · {Math.round(food.caloriesPer100g)} ккал/100г
                </button>
              ))}
              {query.trim() && results.length === 0 && (
                <p className="subtitle">Ничего не найдено.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="subtitle">{selected.canonicalName}</p>
            <div className="field">
              <label>Граммы</label>
              <input
                type="number"
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <label>Приём пищи</label>
              <div className="option-list option-list-row">
                {MEAL_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`option-card${mealType === option.value ? " selected" : ""}`}
                    onClick={() => setMealType(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="subtitle">
              ≈ {Math.round((selected.caloriesPer100g * grams) / 100)} ккал
            </p>
            {error && <p className="error-text">{error}</p>}
            <button className="primary-button" disabled={grams <= 0 || submitting} onClick={submit}>
              {submitting ? "Добавляем..." : "Добавить"}
            </button>
            <button className="back-link" onClick={() => setSelected(null)}>
              ← Выбрать другой продукт
            </button>
          </>
        )}

        <button className="back-link" onClick={onClose}>
          Отмена
        </button>
      </div>
    </div>
  );
}

export function AddMealSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [mode, setMode] = useState<Mode>("choose");

  if (mode === "photo") return <PhotoMealFlow onClose={onClose} onAdded={onAdded} />;
  if (mode === "search") return <SearchMealFlow onClose={onClose} onAdded={onAdded} />;
  if (mode === "recent") return <RecentMealsFlow onClose={onClose} onAdded={onAdded} />;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <p className="title">Добавить еду</p>
        <div className="option-list">
          <button className="option-card" onClick={() => setMode("photo")}>
            📷 Сфотографировать
          </button>
          <button className="option-card" onClick={() => setMode("search")}>
            🔍 Найти вручную
          </button>
          <button className="option-card" onClick={() => setMode("recent")}>
            🔁 Повторить недавнее
          </button>
        </div>
        <button className="back-link" onClick={onClose}>
          Отмена
        </button>
      </div>
    </div>
  );
}
