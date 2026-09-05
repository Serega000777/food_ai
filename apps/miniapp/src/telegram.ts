/** Minimal surface of `window.Telegram.WebApp` this app actually uses — not a full
 * typing of the Telegram Mini Apps JS API. Extend only when a new field is needed. */
interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  colorScheme: "light" | "dark";
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

/** Raw initData for the backend to verify — never read `initDataUnsafe` for auth. */
export function getTelegramInitData(): string | null {
  const real = window.Telegram?.WebApp?.initData || null;
  if (real) return real;

  // Dev-only escape hatch to exercise the real Telegram-auth flow from a plain browser
  // during local development — statically eliminated from production builds since
  // `import.meta.env.DEV` is a Vite build-time constant, never a runtime check.
  if (import.meta.env.DEV) {
    return new URLSearchParams(window.location.search).get("mock_init_data");
  }
  return null;
}

export function initTelegramWebApp(): void {
  window.Telegram?.WebApp?.ready();
  window.Telegram?.WebApp?.expand();
}
