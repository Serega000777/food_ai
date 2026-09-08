/** Master prompt §24 design-system component. A dependency-free SVG ring — the same
 * reasoning as Progress.tsx's sparkline: one shape doesn't need a charting library. */
const SIZE = 176;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const percent = target > 0 ? Math.min(1, consumed / target) : 0;
  const offset = CIRCUMFERENCE * (1 - percent);
  const remaining = Math.max(0, Math.round(target - consumed));

  return (
    <div className="calorie-ring">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="calorie-ring-label">
        <div className="calorie-ring-value">{Math.round(consumed)}</div>
        <div className="calorie-ring-caption">
          из {Math.round(target)} ккал
          <br />
          осталось {remaining}
        </div>
      </div>
    </div>
  );
}
