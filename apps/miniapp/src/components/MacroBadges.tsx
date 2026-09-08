/** Master prompt §24 design-system component (MacroProgress) — one colored icon badge
 * per macro, consistent across Home and Progress rather than each screen inventing its
 * own macro layout. `target` is optional: Home passes it (progress toward a goal),
 * Progress's day-average card doesn't have one. */
interface MacroBadgeItem {
  key: "protein" | "carbs" | "fat";
  label: string;
  icon: string;
  color: string;
  value: number;
  target?: number;
}

export function MacroBadges({
  proteinG,
  carbsG,
  fatG,
  proteinTargetG,
  carbsTargetG,
  fatTargetG,
}: {
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinTargetG?: number;
  carbsTargetG?: number;
  fatTargetG?: number;
}) {
  const items: MacroBadgeItem[] = [
    {
      key: "protein",
      label: "Белки",
      icon: "🥩",
      color: "var(--color-protein)",
      value: proteinG,
      target: proteinTargetG,
    },
    {
      key: "carbs",
      label: "Углеводы",
      icon: "🌾",
      color: "var(--color-carbs)",
      value: carbsG,
      target: carbsTargetG,
    },
    {
      key: "fat",
      label: "Жиры",
      icon: "💧",
      color: "var(--color-fat)",
      value: fatG,
      target: fatTargetG,
    },
  ];

  return (
    <div className="macro-badges">
      {items.map((item) => (
        <div className="macro-badge" key={item.key}>
          <div
            className="macro-badge-icon"
            style={{ background: `color-mix(in srgb, ${item.color} 18%, transparent)` }}
          >
            {item.icon}
          </div>
          <div className="macro-badge-value">
            {Math.round(item.value)}
            {item.target !== undefined && (
              <span className="macro-badge-target">/{Math.round(item.target)}</span>
            )}{" "}
            г
          </div>
          <div className="macro-badge-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
