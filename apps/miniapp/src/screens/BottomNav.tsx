import { ChartIcon, DiaryIcon, HomeIcon, UserIcon } from "../components/icons";

export type Tab = "home" | "diary" | "progress" | "profile";

const TABS: Array<{ key: Tab; label: string; icon: () => React.ReactElement }> = [
  { key: "home", label: "Сегодня", icon: HomeIcon },
  { key: "diary", label: "Дневник", icon: DiaryIcon },
  { key: "progress", label: "Прогресс", icon: ChartIcon },
  { key: "profile", label: "Профиль", icon: UserIcon },
];

/** Icon + label pairs, Telegram-tab-bar style — AI tab still joins later (master
 * prompt §13: no fake screens for missing features) once it has something real to
 * show; Профиль fills that slot for now with real weight/goal settings instead. */
export function BottomNav({
  active,
  onSelect,
  onAdd,
}: {
  active: Tab;
  onSelect: (tab: Tab) => void;
  onAdd: () => void;
}) {
  const [before, after] = [TABS.slice(0, 2), TABS.slice(2)];

  return (
    <nav className="bottom-nav">
      {before.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          className={`nav-item${active === key ? " active" : ""}`}
          onClick={() => onSelect(key)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
      <button className="nav-add" onClick={onAdd} aria-label="Добавить еду">
        +
      </button>
      {after.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          className={`nav-item${active === key ? " active" : ""}`}
          onClick={() => onSelect(key)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
