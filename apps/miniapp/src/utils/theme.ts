export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "food-ai:theme";

/** Per-viewer convenience only (Настройки → Внешний вид) — localStorage, not synced
 * anywhere server-side. Falls back to "system" if storage is unavailable or empty. */
export function getThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "light" || raw === "dark" ? raw : "system";
  } catch {
    return "system";
  }
}

/** `data-theme` on <html> is what packages/ui-tokens's CSS actually reads — "system"
 * removes the attribute so `prefers-color-scheme` decides again. */
export function applyThemePreference(preference: ThemePreference): void {
  if (preference === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = preference;

  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Best-effort — losing the stored preference just means it resets to "system".
  }
}
