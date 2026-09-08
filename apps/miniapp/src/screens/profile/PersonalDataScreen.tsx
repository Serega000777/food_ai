import type { MeResponse, Sex } from "@food-ai/contracts";
import { useState } from "react";

import { updateGoal, updateProfile } from "../../api/endpoints";

const SEX_OPTIONS: Array<{ value: Sex; label: string }> = [
  { value: "male", label: "Мужской" },
  { value: "female", label: "Женский" },
];

export function PersonalDataScreen({
  me,
  targetWeightKg,
  onBack,
  onSaved,
}: {
  me: MeResponse;
  targetWeightKg: number | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [sex, setSex] = useState<Sex | undefined>(me.profile.sex ?? undefined);
  const [birthDate, setBirthDate] = useState(me.profile.birthDate ?? "");
  const [heightCm, setHeightCm] = useState(me.profile.heightCm ?? 0);
  const [targetWeight, setTargetWeight] = useState(targetWeightKg ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        sex,
        birthDate: birthDate || undefined,
        heightCm: heightCm || undefined,
      });
      if (targetWeight > 0 && targetWeight !== targetWeightKg) {
        await updateGoal({ targetWeightKg: targetWeight });
      }
      onSaved();
    } catch {
      setError("Не получилось сохранить. Проверь данные и попробуй снова.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen">
      <button className="back-link" onClick={onBack}>
        ← Назад
      </button>
      <p className="title">Личные данные</p>

      <div className="field">
        <label>Пол</label>
        <div className="option-list option-list-row">
          {SEX_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`option-card${sex === option.value ? " selected" : ""}`}
              onClick={() => setSex(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Дата рождения</label>
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </div>

      <div className="field">
        <label>Рост, см</label>
        <input
          type="number"
          value={heightCm || ""}
          onChange={(e) => setHeightCm(Number(e.target.value) || 0)}
        />
      </div>

      <div className="field">
        <label>Целевой вес, кг</label>
        <input
          type="number"
          value={targetWeight || ""}
          onChange={(e) => setTargetWeight(Number(e.target.value) || 0)}
        />
      </div>

      {error && <p className="error-text">{error}</p>}
      <div className="spacer" />
      <button className="primary-button" disabled={saving} onClick={() => void save()}>
        {saving ? "Сохраняем..." : "Сохранить"}
      </button>
    </div>
  );
}
