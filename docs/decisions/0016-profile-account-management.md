# ADR 0016: Profile restructuring — goal overrides, account deletion, theme

## Status

Accepted

## Context

The user asked to rebuild the Profile tab and bottom nav after sharing reference
screenshots of a competing app (Cal AI)'s account/settings screens. Comparing that
reference against the master prompt surfaced two things already required by spec but
never actually built:

- §12: "user can override targets later" — no way existed to directly set
  calorie/macro targets; only the full onboarding-formula recompute (`POST /v1/goals`)
  existed.
- §26/§30: account export/delete — `DELETE /v1/account` was never implemented, and the
  already-existing `POST /v1/auth/logout` endpoint had no button anywhere in the client.

Several other things on the reference screens have no honest equivalent in this app
yet and were deliberately left out rather than built as non-functional decoration —
master prompt §13's "no fake screen" rule applies to settings toggles exactly as much
as to nav tabs.

## Decisions

**Goal override is a new `PATCH /v1/goals`, not an extension of `POST /v1/goals`.**
`create()` always runs the initial-formula calculation from profile+activity+pace;
`update()` never does — it takes whatever fields are given and stores them as-is with
`source: "USER"` (an enum value that already existed in the schema, unused until now).
Both close out the previous active goal and insert a new one, preserving history the
same way. A new `GET /v1/goals` returns the active goal — nothing previously exposed
`targetWeightKg` on its own (the dashboard only ever exposed the four macro targets),
and the Profile screens need it for display/editing.

**Account deletion cleans up S3 objects explicitly, best-effort, before dropping the
row.** The `users` row's `onDelete: cascade` FKs handle every DB table already; object
storage has no such mechanism, so `AccountService` deletes each `meal_photos` object
and thumbnail first. A storage failure is logged, never thrown — the user's actual
request (delete my account) must not fail because one old photo's S3 delete call
errored.

**Logout stays a real session revocation, not a fake "sign out" state.** In real
Telegram, closing and reopening the Mini App re-authenticates automatically via
Telegram's own identity — there is no persistent "logged out" screen to show. The
button calls the existing `POST /v1/auth/logout` (revokes the refresh token
server-side) and clears local tokens; the very next open just gets a new session. This
is correct behavior for a Mini App, not a shortcut around building a "real" logout.

**Theme picker is genuinely new capability, not just copying a UI control.**
`packages/ui-tokens`'s tokens.css previously only branched on
`prefers-color-scheme`. Added `:root[data-theme="light"|"dark"]` overrides (guarding
the media query with `:not([data-theme="light"])` so an explicit light choice beats a
dark OS preference) — the standard pattern for "system / light / dark" toggles.
Preference lives in `localStorage` only, applied via a `data-theme` attribute set
before first paint in `main.tsx`.

**Explicitly not built, with reasons:**

- Groups/social tab, referral program, family-plan upsell — master prompt §43 bans
  social features and premature monetization infrastructure in MVP.
- Apple Health sync, home/lock-screen widgets, Live Activity — impossible for a
  Telegram Mini App (no HealthKit/WidgetKit access from a web view); native-client-only
  per the roadmap's last item.
- Badge celebrations, "add burned calories," calorie carryover, marketing emails,
  language picker — no backing feature exists (no achievement system, no exercise
  logging, no email collection, no i18n). A toggle with nothing behind it is the "fake
  screen" master prompt §13 forbids.
- PDF export, push-notification meal reminders — real, valid future features
  (`POST /v1/account/export`, `send_reminder` are both already named in the master
  prompt's later-phase lists) but need their own infrastructure (a scheduler for
  reminders, a PDF renderer for export) — out of scope for this pass.

## Consequences

- `packages/ui-tokens` is no longer purely OS-driven — any future screen reading these
  tokens must not assume `prefers-color-scheme` is the only source of truth.
- The Profile tab is now five screens (`screens/profile/`) instead of one flat file —
  matches the `screens/onboarding/` precedent for a multi-step area.
- Recomputing the plan from the formula (`OnboardingFlow`, re-run from Profile) and
  overriding it directly (`EditGoalsScreen`) now coexist as two distinct, equally valid
  paths to change a goal — this was a deliberate choice to not lose the wizard when
  adding direct editing.
