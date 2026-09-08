import type { DashboardResponse, Goal, MeResponse, ProgressResponse } from "@food-ai/contracts";
import { useEffect, useState } from "react";

import { getDashboard, getGoal, getMe, getProgress } from "../api/endpoints";

import { OnboardingFlow } from "./onboarding/OnboardingFlow";
import { EditGoalsScreen } from "./profile/EditGoalsScreen";
import { PersonalDataScreen } from "./profile/PersonalDataScreen";
import { ProfileRoot, type ProfileView } from "./profile/ProfileRoot";
import { SettingsScreen } from "./profile/SettingsScreen";
import { WeightHistoryScreen } from "./profile/WeightHistoryScreen";

/** "Личный кабинет" — root list + four sub-screens (own files under screens/profile/).
 * All four load off the same fetch here, so saving on any of them just re-runs `load`
 * and returns to the root list rather than each screen managing its own refetch. */
export function Profile() {
  const [view, setView] = useState<ProfileView | "root">("root");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);

  async function load() {
    const [meRes, dashboardRes, goalRes, progressRes] = await Promise.all([
      getMe(),
      getDashboard(),
      getGoal(),
      getProgress(7),
    ]);
    setMe(meRes);
    setDashboard(dashboardRes);
    setGoal(goalRes);
    setProgress(progressRes);
  }

  useEffect(() => {
    void load();
  }, []);

  if (!me || !dashboard || !goal) {
    return (
      <div className="screen">
        <p className="subtitle">Загрузка...</p>
      </div>
    );
  }

  function backToRoot() {
    setView("root");
  }

  function savedAndBack() {
    void load();
    setView("root");
  }

  if (view === "recalculate") {
    return <OnboardingFlow onComplete={savedAndBack} />;
  }
  if (view === "goals") {
    return <EditGoalsScreen target={dashboard.target} onBack={backToRoot} onSaved={savedAndBack} />;
  }
  if (view === "personal") {
    return (
      <PersonalDataScreen
        me={me}
        targetWeightKg={goal.targetWeightKg}
        onBack={backToRoot}
        onSaved={savedAndBack}
      />
    );
  }
  if (view === "weightHistory") {
    return <WeightHistoryScreen onBack={backToRoot} />;
  }
  if (view === "settings") {
    return <SettingsScreen onBack={backToRoot} />;
  }

  return <ProfileRoot progress={progress} onNavigate={setView} />;
}
