export type Tab = "home" | "diary";

/** Only Сегодня/Дневник/+ — Прогресс and AI tabs join once Phase 6 gives them
 * something real to show (master prompt §13: no fake screens for missing features). */
export function BottomNav({
  active,
  onSelect,
  onAdd,
}: {
  active: Tab;
  onSelect: (tab: Tab) => void;
  onAdd: () => void;
}) {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item${active === "home" ? " active" : ""}`}
        onClick={() => onSelect("home")}
      >
        Сегодня
      </button>
      <button className="nav-add" onClick={onAdd} aria-label="Добавить еду">
        +
      </button>
      <button
        className={`nav-item${active === "diary" ? " active" : ""}`}
        onClick={() => onSelect("diary")}
      >
        Дневник
      </button>
    </nav>
  );
}
