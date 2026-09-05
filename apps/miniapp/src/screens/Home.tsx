import type { DashboardResponse } from "@food-ai/contracts";

function MacroBar({ label, value, target }: { label: string; value: number; target: number }) {
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="macro-item">
      <div className="label">{label}</div>
      <div className="value">
        {value}/{target} г
      </div>
      <div className="progress-bar">
        <div style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function Home({ dashboard }: { dashboard: DashboardResponse }) {
  const remaining = Math.max(0, Math.round(dashboard.remaining.calories));

  return (
    <div className="screen">
      <p className="subtitle">Сегодня</p>

      <div className="card" style={{ textAlign: "center" }}>
        <div className="big-number">{Math.round(dashboard.consumed.calories)}</div>
        <p className="subtitle">
          из {Math.round(dashboard.target.calories)} ккал · осталось {remaining}
        </p>

        <div className="macro-row">
          <MacroBar
            label="Белки"
            value={Math.round(dashboard.consumed.proteinG)}
            target={Math.round(dashboard.target.proteinG)}
          />
          <MacroBar
            label="Жиры"
            value={Math.round(dashboard.consumed.fatG)}
            target={Math.round(dashboard.target.fatG)}
          />
          <MacroBar
            label="Углеводы"
            value={Math.round(dashboard.consumed.carbsG)}
            target={Math.round(dashboard.target.carbsG)}
          />
        </div>
      </div>

      <div className="card">
        <p className="subtitle">
          Дневник и добавление еды по фото появятся в следующем обновлении. Пока здесь хранится
          только твой план.
        </p>
      </div>

      <div className="spacer" />
    </div>
  );
}
