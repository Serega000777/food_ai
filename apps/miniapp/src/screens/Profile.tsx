import type { DashboardResponse, MeResponse, ProgressResponse } from "@food-ai/contracts";
import { useEffect, useState } from "react";

import { getDashboard, getMe, getProgress, logWeight } from "../api/endpoints";

import { OnboardingFlow } from "./onboarding/OnboardingFlow";

const SEX_LABEL: Record<string, string> = { male: "Мужской", female: "Женский" };

/** "Личный кабинет" — the weight/goal-editing home the onboarding wizard doesn't have
 * once it's done. Re-running the goal calculation reuses `OnboardingFlow` itself
 * rather than a second wizard implementation. */
export function Profile() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  async function load() {
    const [meRes, dashboardRes, progressRes] = await Promise.all([
      getMe(),
      getDashboard(),
      getProgress(7),
    ]);
    setMe(meRes);
    setDashboard(dashboardRes);
    setProgress(progressRes);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitWeight() {
    const weightKg = Number(weightInput);
    if (!weightKg || weightKg <= 0) return;
    setLogging(true);
    setError(null);
    try {
      await logWeight({ weightKg });
      setWeightInput("");
      await load();
    } catch {
      setError("Не получилось сохранить вес. Попробуй ещё раз.");
    } finally {
      setLogging(false);
    }
  }

  if (wizardOpen) {
    return (
      <OnboardingFlow
        onComplete={() => {
          setWizardOpen(false);
          void load();
        }}
      />
    );
  }

  if (!me || !dashboard) {
    return (
      <div className="screen">
        <p className="subtitle">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <p className="title">Профиль</p>

      <div className="card">
        <div className="meal-card-header">
          <strong>Текущий вес</strong>
          {progress && progress.weightTrend.currentWeightKg !== null && (
            <span>{progress.weightTrend.currentWeightKg} кг</span>
          )}
        </div>
        <div className="field" style={{ marginTop: "var(--space-3)" }}>
          <label>Записать вес сегодня</label>
          <div className="option-list-row">
            <input
              type="number"
              inputMode="decimal"
              placeholder="кг"
              style={{ flex: 1 }}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
            />
            <button
              className="primary-button"
              disabled={logging || !weightInput}
              onClick={() => void submitWeight()}
            >
              {logging ? "..." : "Сохранить"}
            </button>
          </div>
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>

      <div className="card">
        <strong>Дневная цель</strong>
        <div className="big-number" style={{ marginTop: "var(--space-2)" }}>
          {Math.round(dashboard.target.calories)} ккал
        </div>
        <div className="macro-row">
          <div className="macro-item">
            <div className="label">Белки</div>
            <div className="value">{Math.round(dashboard.target.proteinG)} г</div>
          </div>
          <div className="macro-item">
            <div className="label">Жиры</div>
            <div className="value">{Math.round(dashboard.target.fatG)} г</div>
          </div>
          <div className="macro-item">
            <div className="label">Углеводы</div>
            <div className="value">{Math.round(dashboard.target.carbsG)} г</div>
          </div>
        </div>
        <button className="back-link" onClick={() => setWizardOpen(true)}>
          Пересчитать цель
        </button>
      </div>

      <div className="card">
        <strong>Данные профиля</strong>
        <p className="subtitle" style={{ marginTop: "var(--space-2)" }}>
          {me.profile.sex ? SEX_LABEL[me.profile.sex] : "—"} · {me.profile.heightCm ?? "—"} см ·{" "}
          {me.profile.birthDate ?? "—"}
        </p>
      </div>

      <div className="spacer" />
    </div>
  );
}
