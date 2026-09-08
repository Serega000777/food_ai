import type { WeightLogDto } from "@food-ai/contracts";
import { useEffect, useState } from "react";

import { getProgress, logWeight } from "../../api/endpoints";

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function WeightHistoryScreen({ onBack }: { onBack: () => void }) {
  const [logs, setLogs] = useState<WeightLogDto[] | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const progress = await getProgress(90);
    // Newest first — the range comes back chronological (oldest → newest).
    setLogs([...progress.weightLogs].reverse());
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit() {
    const weightKg = Number(weightInput);
    if (!weightKg || weightKg <= 0) return;
    setSaving(true);
    try {
      await logWeight({ weightKg });
      setWeightInput("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen">
      <button className="back-link" onClick={onBack}>
        ← Назад
      </button>
      <p className="title">История веса</p>

      <div className="card">
        <label style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Записать вес</label>
        <div className="option-list-row" style={{ marginTop: "var(--space-2)" }}>
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
            disabled={saving || !weightInput}
            onClick={() => void submit()}
          >
            {saving ? "..." : "Записать"}
          </button>
        </div>
      </div>

      {logs === null && <p className="subtitle">Загрузка...</p>}
      {logs?.length === 0 && <p className="subtitle">За последние 90 дней записей веса ещё нет.</p>}
      {logs?.map((log) => (
        <div key={log.id} className="card meal-card-header">
          <strong>{log.weightKg} кг</strong>
          <span className="subtitle">{DATE_FORMATTER.format(new Date(log.measuredAt))}</span>
        </div>
      ))}
    </div>
  );
}
