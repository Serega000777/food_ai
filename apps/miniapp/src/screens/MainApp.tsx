import type { DashboardResponse } from "@food-ai/contracts";
import { useState } from "react";

import { AddMealSheet } from "./AddMealSheet";
import { BottomNav, type Tab } from "./BottomNav";
import { Diary } from "./Diary";
import { Home } from "./Home";
import { Profile } from "./Profile";
import { Progress } from "./Progress";

export function MainApp({ initialDashboard }: { initialDashboard: DashboardResponse }) {
  const [tab, setTab] = useState<Tab>("home");
  const [addMealOpen, setAddMealOpen] = useState(false);
  // Bumped whenever a meal is added/edited/deleted anywhere — Home's own effect
  // depends on it to refetch, since Home (not MainApp) now owns which date it's showing.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="app-shell">
      <div className="app-content">
        {tab === "home" && <Home initialDashboard={initialDashboard} refreshKey={refreshKey} />}
        {tab === "diary" && <Diary onChanged={() => setRefreshKey((k) => k + 1)} />}
        {tab === "progress" && <Progress />}
        {tab === "profile" && <Profile />}
      </div>

      <BottomNav active={tab} onSelect={setTab} onAdd={() => setAddMealOpen(true)} />

      {addMealOpen && (
        <AddMealSheet
          onClose={() => setAddMealOpen(false)}
          onAdded={() => {
            setAddMealOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
