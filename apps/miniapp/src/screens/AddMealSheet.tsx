import type { Food, MealType } from "@food-ai/contracts";
import { useEffect, useState } from "react";

import { createMeal, searchFoods } from "../api/endpoints";

const MEAL_TYPE_OPTIONS: Array<{ value: MealType; label: string }> = [
  { value: "BREAKFAST", label: "Завтрак" },
  { value: "LUNCH", label: "Обед" },
  { value: "DINNER", label: "Ужин" },
  { value: "SNACK", label: "Перекус" },
  { value: "OTHER", label: "Другое" },
];

const SEARCH_DEBOUNCE_MS = 250;

export function AddMealSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
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
        <p className="title">Добавить еду</p>

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
