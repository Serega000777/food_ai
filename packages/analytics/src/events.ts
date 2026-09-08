/**
 * The canonical event taxonomy from master prompt §28. Only a subset is actually
 * emitted as of Phase 6 (server-observable events with a clear, single call site);
 * the rest are genuine future work (client-only UX events, or events for flows that
 * don't exist yet), not speculative plumbing — listing them here just means adding a
 * new emission later is "call `track` with an existing name", not "invent a name".
 */
export type AnalyticsEventType =
  | "onboarding_started"
  | "onboarding_completed"
  | "meal_add_opened"
  | "photo_capture_started"
  | "photo_uploaded"
  | "analysis_completed"
  | "analysis_failed"
  | "analysis_clarification_shown"
  | "meal_confirmed"
  | "meal_corrected"
  | "recent_meal_repeated"
  | "diary_opened"
  | "progress_opened"
  | "paywall_viewed"
  | "trial_started"
  | "subscribed";

/** Never put full meal text/photo bytes in `properties` (master prompt §28) — only
 * small, non-sensitive aggregates (ids, counts, enum-like strings). */
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  properties?: Record<string, string | number | boolean | null>;
}
