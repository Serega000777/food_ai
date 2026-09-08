import { useState } from "react";

import { applyThemePreference, getThemePreference, type ThemePreference } from "../../utils/theme";

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; swatch: string }> = [
  {
    value: "system",
    label: "Система",
    swatch: "linear-gradient(135deg, #faf9f6 50%, #1c1e1d 50%)",
  },
  { value: "light", label: "Светлая", swatch: "#faf9f6" },
  { value: "dark", label: "Тёмная", swatch: "#1c1e1d" },
];

/** Everything else on Cal AI's reference Settings screen (badge celebrations, Live
 * Activity, burned-calories/carryover toggles, marketing emails, language picker) has
 * no backing feature in this app yet — a toggle with nothing behind it is exactly the
 * "fake screen" master prompt §13 forbids, so only the theme picker (which the design
 * system already fully supports) is real here. */
export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference());

  function select(preference: ThemePreference) {
    setTheme(preference);
    applyThemePreference(preference);
  }

  return (
    <div className="screen">
      <button className="back-link" onClick={onBack}>
        ← Назад
      </button>
      <p className="title">Настройки</p>

      <p className="subtitle" style={{ marginBottom: "var(--space-3)" }}>
        Внешний вид
      </p>
      <div className="theme-picker">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={theme === option.value ? "selected" : ""}
            onClick={() => select(option.value)}
          >
            <span className="theme-picker-swatch" style={{ background: option.swatch }} />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
