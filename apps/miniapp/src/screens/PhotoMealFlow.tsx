import type { MealAnalysisResponse, MealType } from "@food-ai/contracts";
import { useRef, useState } from "react";

import {
  confirmMealAnalysis,
  getMealAnalysis,
  refineMealAnalysis,
  uploadMealPhoto,
} from "../api/endpoints";

const MEAL_TYPE_OPTIONS: Array<{ value: MealType; label: string }> = [
  { value: "BREAKFAST", label: "Завтрак" },
  { value: "LUNCH", label: "Обед" },
  { value: "DINNER", label: "Ужин" },
  { value: "SNACK", label: "Перекус" },
  { value: "OTHER", label: "Другое" },
];

// ACCEPTABLE = minimal noise, everything else asks for a glance before confirming
// (master prompt §11 / §15) — collapsed to one badge for now; per-decision flows
// (VERIFY_ITEM's "Похоже на X. Верно?" vs ASK_QUESTION's X/Y/Z picker) are UI polish
// for a later pass, not part of proving the pipeline itself works end-to-end.
const CONFIDENCE_LABEL: Record<string, string> = {
  ACCEPTABLE: "Высокая уверенность",
  VERIFY_ITEM: "Проверь, пожалуйста",
  ASK_QUESTION: "Не уверен — уточни",
  MANUAL_REQUIRED: "Не распознано",
};

const TERMINAL_STATUSES = new Set(["NEEDS_CLARIFICATION", "READY_TO_CONFIRM"]);
const POLL_INTERVAL_MS = 700;
const POLL_TIMEOUT_MS = 20_000;

async function pollUntilSettled(analysisId: string): Promise<MealAnalysisResponse> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const analysis = await getMealAnalysis(analysisId);
    if (TERMINAL_STATUSES.has(analysis.status) || analysis.status.endsWith("FAILED"))
      return analysis;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error("timeout");
}

export function PhotoMealFlow({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analysis, setAnalysis] = useState<MealAnalysisResponse | null>(null);
  const [mealType, setMealType] = useState<MealType>("SNACK");
  const [correctionText, setCorrectionText] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFileSelected(file: File) {
    setStatus("uploading");
    setError(null);
    try {
      const created = await uploadMealPhoto(file);
      setStatus("analyzing");
      const settled = await pollUntilSettled(created.id);
      if (settled.status.endsWith("FAILED")) {
        setStatus("error");
        setError("Не удалось проанализировать фото");
        return;
      }
      setAnalysis(settled);
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Не удалось проанализировать фото");
    }
  }

  async function handleRefine() {
    if (!analysis || !correctionText.trim()) return;
    setBusy(true);
    try {
      const refined = await refineMealAnalysis(analysis.id, correctionText.trim());
      setAnalysis(refined);
      setCorrectionText("");
    } catch {
      setError("Не получилось применить исправление");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!analysis) return;
    setBusy(true);
    try {
      await confirmMealAnalysis(analysis.id, mealType);
      onAdded();
    } catch {
      setError("Не получилось добавить");
      setBusy(false);
    }
  }

  if (status === "uploading" || status === "analyzing") {
    return (
      <div className="sheet-overlay" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <p className="title">Определяю продукты</p>
          <p className="subtitle">
            {status === "uploading" ? "Загружаю фото..." : "Оцениваю порцию и считаю КБЖУ..."}
          </p>
        </div>
      </div>
    );
  }

  if (analysis) {
    return (
      <div className="sheet-overlay" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <p className="title">{analysis.dishName ?? "AI определил продукты"}</p>

          {analysis.items.map((item) => (
            <div key={item.id} className="card">
              <div className="meal-card-header">
                <strong>{item.label}</strong>
                <span>{Math.round(item.calories)} ккал</span>
              </div>
              <div className="subtitle">≈ {Math.round(item.grams)} г</div>
              <div className="subtitle">{CONFIDENCE_LABEL[item.decision] ?? item.decision}</div>
            </div>
          ))}

          <p className="subtitle">
            Итого: {analysis.totalCalories !== null ? Math.round(analysis.totalCalories) : "—"} ккал
          </p>

          <div className="field">
            <label>Исправить AI (например «было 200 г»)</label>
            <input
              value={correctionText}
              onChange={(e) => setCorrectionText(e.target.value)}
              placeholder="было 200 г"
            />
          </div>
          <button
            className="back-link"
            disabled={!correctionText.trim() || busy}
            onClick={() => void handleRefine()}
          >
            Применить исправление
          </button>

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

          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" disabled={busy} onClick={() => void handleConfirm()}>
            {busy ? "Добавляем..." : `Добавить ${Math.round(analysis.totalCalories ?? 0)} ккал`}
          </button>
          <button className="back-link" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <p className="title">Сфотографировать еду</p>
        <p className="subtitle">Постарайся вместить всё блюдо в кадр.</p>
        {error && <p className="error-text">{error}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileSelected(file);
          }}
        />
        <button className="primary-button" onClick={() => fileInputRef.current?.click()}>
          Открыть камеру
        </button>
        <button className="back-link" onClick={onClose}>
          Отмена
        </button>
      </div>
    </div>
  );
}
