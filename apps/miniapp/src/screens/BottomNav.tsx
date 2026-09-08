export type Tab = "home" | "diary" | "progress";

/** AI tab still joins later (master prompt §13: no fake screens for missing features)
 * — Progress has something real to show as of Phase 6. */
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
      <button
        className={`nav-item${active === "diary" ? " active" : ""}`}
        onClick={() => onSelect("diary")}
      >
        Дневник
      </button>
      <button className="nav-add" onClick={onAdd} aria-label="Добавить еду">
        +
      </button>
      <button
        className={`nav-item${active === "progress" ? " active" : ""}`}
        onClick={() => onSelect("progress")}
      >
        Прогресс
      </button>
    </nav>
  );
}
