import type { DashboardResponse } from "@food-ai/contracts";
import { useEffect, useState } from "react";

import { ApiError } from "./api/client";
import { getDashboard, loginWithTelegram } from "./api/endpoints";
import { Home } from "./screens/Home";
import { StatusScreen } from "./screens/StatusScreen";
import { OnboardingFlow } from "./screens/onboarding/OnboardingFlow";
import { getTelegramInitData, initTelegramWebApp } from "./telegram";

type AppState =
  | { status: "loading" }
  | { status: "not-in-telegram" }
  | { status: "error"; message: string }
  | { status: "onboarding" }
  | { status: "home"; dashboard: DashboardResponse };

export function App() {
  const [state, setState] = useState<AppState>({ status: "loading" });

  useEffect(() => {
    initTelegramWebApp();
    const initData = getTelegramInitData();
    if (!initData) {
      setState({ status: "not-in-telegram" });
      return;
    }

    void (async () => {
      try {
        await loginWithTelegram(initData);
        const dashboard = await getDashboard();
        setState({ status: "home", dashboard });
      } catch (error) {
        // No active goal yet (AT: dashboard returns 404 until onboarding creates one).
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: "onboarding" });
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Неизвестная ошибка",
        });
      }
    })();
  }, []);

  switch (state.status) {
    case "loading":
      return <StatusScreen title="Загрузка..." />;
    case "not-in-telegram":
      return (
        <StatusScreen
          title="Открой через Telegram"
          subtitle="Это приложение работает как Telegram Mini App."
        />
      );
    case "error":
      return <StatusScreen title="Что-то пошло не так" subtitle={state.message} isError />;
    case "onboarding":
      return <OnboardingFlow onComplete={(dashboard) => setState({ status: "home", dashboard })} />;
    case "home":
      return <Home dashboard={state.dashboard} />;
  }
}
