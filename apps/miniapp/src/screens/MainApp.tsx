import type { DashboardResponse } from "@food-ai/contracts";
import { useState } from "react";

import { getDashboard } from "../api/endpoints";

import { AddMealSheet } from "./AddMealSheet";
import { BottomNav, type Tab } from "./BottomNav";
import { Diary } from "./Diary";
import { Home } from "./Home";
import { Progress } from "./Progress";

export function MainApp({ initialDashboard }: { initialDashboard: DashboardResponse }) {
  const [tab, setTab] = useState<Tab>("home");
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [addMealOpen, setAddMealOpen] = useState(false);

  async function refreshDashboard() {
    setDashboard(await getDashboard());
  }

  return (
    <div className="app-shell">
      <div className="app-content">
        {tab === "home" && <Home dashboard={dashboard} />}
        {tab === "diary" && <Diary onChanged={() => void refreshDashboard()} />}
        {tab === "progress" && <Progress />}
      </div>

      <BottomNav active={tab} onSelect={setTab} onAdd={() => setAddMealOpen(true)} />

      {addMealOpen && (
        <AddMealSheet
          onClose={() => setAddMealOpen(false)}
          onAdded={() => {
            setAddMealOpen(false);
            void refreshDashboard();
          }}
        />
      )}
    </div>
  );
}
