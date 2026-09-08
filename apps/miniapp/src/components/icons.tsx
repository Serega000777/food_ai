/** Stroke-based, dependency-free icons for the bottom tab bar — matches Telegram's own
 * icon+label tab bar convention rather than text-only buttons. `currentColor` picks up
 * `.nav-item`'s color, so active/inactive state needs no separate icon variant. */
const COMMON = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon() {
  return (
    <svg {...COMMON}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

export function DiaryIcon() {
  return (
    <svg {...COMMON}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg {...COMMON}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg {...COMMON}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg {...COMMON} width={18} height={18}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
