import type { ProgressRangeDays, ProgressResponse, WeightLogDto } from "@food-ai/contracts";
import { useEffect, useState } from "react";

import { getProgress, logWeight } from "../api/endpoints";

const RANGE_OPTIONS: ProgressRangeDays[] = [7, 30, 90];

/** A dependency-free inline sparkline — the trend only needs to read "up/down/flat" at
 * a glance (master prompt §20: no aggressive day-to-day framing), not a full charting
 * library for one polyline. */
function WeightSparkline({ points }: { points: WeightLogDto[] }) {
  if (points.length < 2) return null;

  const width = 280;
  const height = 64;
  const weights = points.map((p) => p.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points
    .map((p, i) => `${i * stepX},${height - ((p.weightKg - min) / span) * height}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="weight-sparkline" preserveAspectRatio="none">
      <polyline points={coords} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
    </svg>
  );
}

export function Progress() {
  const [range, setRange] = useState<ProgressRangeDays>(30);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [weightInput, setWeightInput] = useState("");
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(targetRange: ProgressRangeDays) {
    setLoading(true);
    setProgress(await getProgress(targetRange));
    setLoading(false);
  }

  useEffect(() => {
    void load(range);
  }, [range]);

  async function submitWeight() {
    const weightKg = Number(weightInput);
    if (!weightKg || weightKg <= 0) return;
    setLogging(true);
    setError(null);
    try {
      await logWeight({ weightKg });
      setWeightInput("");
      await load(range);
    } catch {
      setError("Не получилось сохранить вес. Попробуй ещё раз.");
    } finally {
      setLogging(false);
    }
  }

  if (loading || !progress) {
    return (
      <div className="screen">
        <p className="subtitle">Загрузка...</p>
      </div>
    );
  }

  const { weightTrend, weightLogs, averages, daysLogged, daysInRange } = progress;

  return (
    <div className="screen">
      <p className="subtitle">Прогресс</p>

      <div className="option-list-row">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option}
            className={`option-card${range === option ? " selected" : ""}`}
            onClick={() => setRange(option)}
          >
            {option} дней
          </button>
        ))}
      </div>

      <div className="card">
        <div className="meal-card-header">
          <strong>Вес</strong>
          {weightTrend.changeKg !== null && (
            <span>
              {weightTrend.changeKg > 0 ? "+" : ""}
              {weightTrend.changeKg.toFixed(1)} кг за {daysInRange} дней
            </span>
          )}
        </div>

        {weightTrend.currentWeightKg !== null ? (
          <div className="big-number">{weightTrend.currentWeightKg} кг</div>
        ) : (
          <p className="subtitle">Пока нет записей веса за этот период.</p>
        )}
        <WeightSparkline points={weightLogs} />

        <div className="field" style={{ marginTop: "var(--space-4)" }}>
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
        <div className="meal-card-header">
          <strong>Среднее в день</strong>
          <span>
            {daysLogged} из {daysInRange} дней
          </span>
        </div>
        <div className="big-number">{Math.round(averages.calories)} ккал</div>
        <div className="macro-row">
          <div className="macro-item">
            <div className="label">Белки</div>
            <div className="value">{Math.round(averages.proteinG)} г</div>
          </div>
          <div className="macro-item">
            <div className="label">Жиры</div>
            <div className="value">{Math.round(averages.fatG)} г</div>
          </div>
          <div className="macro-item">
            <div className="label">Углеводы</div>
            <div className="value">{Math.round(averages.carbsG)} г</div>
          </div>
        </div>
      </div>

      <div className="spacer" />
    </div>
  );
}
