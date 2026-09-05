import type { ActivityLevel, DashboardResponse, Goal, GoalType, Sex } from "@food-ai/contracts";
import { useEffect, useState } from "react";

import { createGoal, getDashboard, updateProfile } from "../../api/endpoints";
import { StatusScreen } from "../StatusScreen";

const DRAFT_KEY = "food-ai:onboarding-draft";

interface Draft {
  goalType?: GoalType;
  sex?: Sex;
  birthDate?: string;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  activityLevel?: ActivityLevel;
  paceKgPerWeek?: number;
}

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : {};
  } catch {
    return {};
  }
}

function needsWeightGoalSteps(goalType?: GoalType): boolean {
  return goalType === "LOSE" || goalType === "GAIN";
}

type StepKey = "welcome" | "goal" | "basics" | "targetWeight" | "activity" | "pace" | "plan";

function getSteps(draft: Draft): StepKey[] {
  const steps: StepKey[] = ["welcome", "goal", "basics"];
  if (needsWeightGoalSteps(draft.goalType)) steps.push("targetWeight");
  steps.push("activity");
  if (needsWeightGoalSteps(draft.goalType)) steps.push("pace");
  steps.push("plan");
  return steps;
}

const GOAL_OPTIONS: Array<{ value: GoalType; label: string }> = [
  { value: "LOSE", label: "Снизить вес" },
  { value: "MAINTAIN", label: "Поддерживать вес" },
  { value: "GAIN", label: "Набрать массу" },
  { value: "TRACK", label: "Просто следить за питанием" },
];

const ACTIVITY_OPTIONS: Array<{ value: ActivityLevel; label: string }> = [
  { value: "sedentary", label: "В основном сижу" },
  { value: "light", label: "Достаточно хожу" },
  { value: "active", label: "Регулярно тренируюсь" },
  { value: "very_active", label: "Очень активен" },
];

const PACE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0.25, label: "Комфортно" },
  { value: 0.5, label: "Умеренно" },
  { value: 0.75, label: "Быстрее" },
];

export function OnboardingFlow({
  onComplete,
}: {
  onComplete: (dashboard: DashboardResponse) => void;
}) {
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const steps = getSteps(draft);
  const step = steps[stepIndex];

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  // Takes the final draft explicitly rather than reading the `draft` state — needed
  // because the MAINTAIN/TRACK path calls this in the same click that sets
  // activityLevel, before that state update has re-rendered.
  async function submitOnboarding(finalDraft: Draft) {
    setSubmitting(true);
    setError(null);
    try {
      await updateProfile({
        birthDate: finalDraft.birthDate,
        sex: finalDraft.sex,
        heightCm: finalDraft.heightCm,
      });
      const createdGoal = await createGoal({
        type: finalDraft.goalType!,
        currentWeightKg: finalDraft.currentWeightKg!,
        targetWeightKg: finalDraft.targetWeightKg,
        activityLevel: finalDraft.activityLevel!,
        paceKgPerWeek: finalDraft.paceKgPerWeek,
      });
      setDraft(finalDraft);
      setGoal(createdGoal);
      setStepIndex(getSteps(finalDraft).length - 1);
    } catch {
      setError("Не получилось рассчитать план. Проверь введённые данные и попробуй снова.");
    } finally {
      setSubmitting(false);
    }
  }

  async function finishOnboarding() {
    localStorage.removeItem(DRAFT_KEY);
    onComplete(await getDashboard());
  }

  if (step === "welcome") {
    return (
      <div className="screen screen-centered">
        <p className="title">Ешь как обычно.</p>
        <p className="subtitle">Подсчёт мы возьмём на себя.</p>
        <button className="primary-button" onClick={goNext}>
          Начать
        </button>
      </div>
    );
  }

  if (step === "goal") {
    return (
      <div className="screen">
        <button className="back-link" onClick={goBack}>
          ← Назад
        </button>
        <p className="title">Какая у тебя цель?</p>
        <div className="option-list">
          {GOAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`option-card${draft.goalType === option.value ? " selected" : ""}`}
              onClick={() => {
                setDraft((d) => ({ ...d, goalType: option.value }));
                goNext();
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "basics") {
    const isComplete = draft.sex && draft.birthDate && draft.heightCm && draft.currentWeightKg;
    return (
      <div className="screen">
        <button className="back-link" onClick={goBack}>
          ← Назад
        </button>
        <p className="title">Расскажи о себе</p>

        <div className="field">
          <label>Пол</label>
          <div className="option-list" style={{ flexDirection: "row" }}>
            {(["male", "female"] as const).map((sex) => (
              <button
                key={sex}
                className={`option-card${draft.sex === sex ? " selected" : ""}`}
                style={{ flex: 1 }}
                onClick={() => setDraft((d) => ({ ...d, sex }))}
              >
                {sex === "male" ? "Мужской" : "Женский"}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Дата рождения</label>
          <input
            type="date"
            value={draft.birthDate ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, birthDate: e.target.value }))}
          />
        </div>

        <div className="field">
          <label>Рост, см</label>
          <input
            type="number"
            value={draft.heightCm ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, heightCm: Number(e.target.value) || undefined }))
            }
          />
        </div>

        <div className="field">
          <label>Текущий вес, кг</label>
          <input
            type="number"
            value={draft.currentWeightKg ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, currentWeightKg: Number(e.target.value) || undefined }))
            }
          />
        </div>

        <div className="spacer" />
        <button className="primary-button" disabled={!isComplete} onClick={goNext}>
          Далее
        </button>
      </div>
    );
  }

  if (step === "targetWeight") {
    return (
      <div className="screen">
        <button className="back-link" onClick={goBack}>
          ← Назад
        </button>
        <p className="title">Целевой вес</p>
        <p className="subtitle">Текущий вес {draft.currentWeightKg} кг</p>
        <div className="field">
          <label>Цель, кг</label>
          <input
            type="number"
            value={draft.targetWeightKg ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, targetWeightKg: Number(e.target.value) || undefined }))
            }
          />
        </div>
        <p className="subtitle">Изменить цель можно в любое время.</p>
        <div className="spacer" />
        <button className="primary-button" disabled={!draft.targetWeightKg} onClick={goNext}>
          Далее
        </button>
      </div>
    );
  }

  if (step === "activity") {
    return (
      <div className="screen">
        <button className="back-link" onClick={goBack}>
          ← Назад
        </button>
        <p className="title">Твоя активность</p>
        <div className="option-list">
          {ACTIVITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`option-card${draft.activityLevel === option.value ? " selected" : ""}`}
              disabled={submitting}
              onClick={() => {
                const updated = { ...draft, activityLevel: option.value };
                if (needsWeightGoalSteps(updated.goalType)) {
                  setDraft(updated);
                  goNext();
                } else {
                  // MAINTAIN/TRACK skip the pace step — this is the last input, submit now.
                  void submitOnboarding(updated);
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  if (step === "pace") {
    return (
      <div className="screen">
        <button className="back-link" onClick={goBack}>
          ← Назад
        </button>
        <p className="title">Скорость достижения цели</p>
        <div className="option-list">
          {PACE_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`option-card${draft.paceKgPerWeek === option.value ? " selected" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, paceKgPerWeek: option.value }))}
            >
              {option.label} · {option.value} кг/нед
            </button>
          ))}
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="spacer" />
        <button
          className="primary-button"
          disabled={!draft.paceKgPerWeek || submitting}
          onClick={() => void submitOnboarding(draft)}
        >
          {submitting ? "Считаем..." : "Далее"}
        </button>
      </div>
    );
  }

  // step === "plan"
  if (!goal) {
    // Defensive only — submitOnboarding always sets goal and stepIndex together, so
    // this step is never reached with goal still null in normal operation.
    return <StatusScreen title="Считаем план" subtitle="Секунду..." />;
  }

  return (
    <div className="screen">
      <p className="title">Твой стартовый план</p>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="big-number">{goal.calorieTarget} ккал</div>
        <div className="macro-row">
          <div className="macro-item">
            <div className="label">Белки</div>
            <div className="value">{goal.proteinTargetG} г</div>
          </div>
          <div className="macro-item">
            <div className="label">Жиры</div>
            <div className="value">{goal.fatTargetG} г</div>
          </div>
          <div className="macro-item">
            <div className="label">Углеводы</div>
            <div className="value">{goal.carbTargetG} г</div>
          </div>
        </div>
      </div>
      <p className="subtitle">
        Это стартовая оценка. По мере накопления данных приложение сможет уточнять твою реальную
        потребность.
      </p>
      <div className="spacer" />
      <button className="primary-button" onClick={finishOnboarding}>
        Начать
      </button>
    </div>
  );
}
