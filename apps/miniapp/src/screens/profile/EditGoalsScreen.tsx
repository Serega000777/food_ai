import type { Macros } from "@food-ai/contracts";
import { useState } from "react";

import { updateGoal } from "../../api/endpoints";

/** Master prompt §12: "user can override targets later" — a direct override, no
 * formula recompute (that's `OnboardingFlow`'s "Пересчитать план" instead). */
export function EditGoalsScreen({
  target,
  onBack,
  onSaved,
}: {
  target: Macros;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [calories, setCalories] = useState(Math.round(target.calories));
  const [protein, setProtein] = useState(Math.round(target.proteinG));
  const [fat, setFat] = useState(Math.round(target.fatG));
  const [carbs, setCarbs] = useState(Math.round(target.carbsG));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateGoal({
        calorieTarget: calories,
        proteinTargetG: protein,
        fatTargetG: fat,
        carbTargetG: carbs,
      });
      onSaved();
    } catch {
      setError("Не получилось сохранить цели. Проверь значения.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen">
      <button className="back-link" onClick={onBack}>
        ← Назад
      </button>
      <p className="title">Изменить цели питания</p>

      <div className="field">
        <label>Калории</label>
        <input
          type="number"
          value={calories || ""}
          onChange={(e) => setCalories(Number(e.target.value) || 0)}
        />
      </div>
      <div className="field">
        <label>Белки, г</label>
        <input
          type="number"
          value={protein || ""}
          onChange={(e) => setProtein(Number(e.target.value) || 0)}
        />
      </div>
      <div className="field">
        <label>Жиры, г</label>
        <input
          type="number"
          value={fat || ""}
          onChange={(e) => setFat(Number(e.target.value) || 0)}
        />
      </div>
      <div className="field">
        <label>Углеводы, г</label>
        <input
          type="number"
          value={carbs || ""}
          onChange={(e) => setCarbs(Number(e.target.value) || 0)}
        />
      </div>

      {error && <p className="error-text">{error}</p>}
      <div className="spacer" />
      <button
        className="primary-button"
        disabled={saving || calories <= 0}
        onClick={() => void save()}
      >
        {saving ? "Сохраняем..." : "Сохранить"}
      </button>
    </div>
  );
}
