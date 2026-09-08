import type { ProgressResponse } from "@food-ai/contracts";
import { useState } from "react";

import { deleteAccount, logout } from "../../api/endpoints";
import { ChevronRightIcon } from "../../components/icons";

export type ProfileView = "personal" | "goals" | "weightHistory" | "settings" | "recalculate";

export function ProfileRoot({
  progress,
  onNavigate,
}: {
  progress: ProgressResponse | null;
  onNavigate: (view: ProfileView) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    await logout();
    window.location.reload();
  }

  async function handleDelete() {
    if (!window.confirm("Удалить аккаунт и все данные без возможности восстановления?")) return;
    setBusy(true);
    try {
      await deleteAccount();
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <p className="title">Профиль</p>

      <p className="list-section-title">Цели и отслеживание</p>
      <div className="list-card">
        <button className="list-row" onClick={() => onNavigate("goals")}>
          <span className="list-row-label">Изменить цели питания</span>
          <ChevronRightIcon />
        </button>
        <button className="list-row" onClick={() => onNavigate("personal")}>
          <span className="list-row-label">Личные данные и целевой вес</span>
          <ChevronRightIcon />
        </button>
        <button className="list-row" onClick={() => onNavigate("recalculate")}>
          <span className="list-row-label">Пересчитать план по формуле</span>
          <ChevronRightIcon />
        </button>
        <button className="list-row" onClick={() => onNavigate("weightHistory")}>
          <span className="list-row-label">История веса</span>
          {progress?.weightTrend.currentWeightKg != null && (
            <span className="list-row-value">{progress.weightTrend.currentWeightKg} кг</span>
          )}
          <ChevronRightIcon />
        </button>
      </div>

      <p className="list-section-title">Приложение</p>
      <div className="list-card">
        <button className="list-row" onClick={() => onNavigate("settings")}>
          <span className="list-row-label">Настройки</span>
          <ChevronRightIcon />
        </button>
      </div>

      <p className="list-section-title">Аккаунт</p>
      <div className="list-card">
        <button className="list-row" disabled={busy} onClick={() => void handleLogout()}>
          <span className="list-row-label">Выйти</span>
        </button>
      </div>
      <button
        className="danger-link"
        style={{ marginTop: "var(--space-4)" }}
        disabled={busy}
        onClick={() => void handleDelete()}
      >
        Удалить аккаунт
      </button>

      <div className="spacer" />
    </div>
  );
}
