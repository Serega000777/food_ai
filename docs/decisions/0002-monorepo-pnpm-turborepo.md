# ADR 0002: pnpm workspaces + Turborepo for the monorepo

## Status

Accepted

## Context

The target architecture (technical spec §5) shares domain logic, contracts, and design
tokens between a Telegram Mini App today and native iOS/Android clients later, all
against one backend. That needs a monorepo with strict, cheap-to-run task orchestration
— without pulling in a heavier tool (Nx, Bazel) the project has no current need for.

## Decision

- pnpm workspaces (`apps/*`, `packages/*`) for dependency management and linking.
- Turborepo for running `build`/`lint`/`typecheck`/`test` across packages with caching
  and correct dependency ordering (`dependsOn: ["^build"]`).
- `pnpm-lock.yaml` is committed and CI installs with `--frozen-lockfile`.
- Shared tooling config (`tsconfig.*`, ESLint flat config, Prettier) lives in
  `packages/config` and is extended by every workspace, not copy-pasted.

## Consequences

- New apps/packages plug into the same `pnpm <script>` / `turbo run <task>` surface
  with no bespoke per-package tooling.
- Turborepo's local cache keeps `lint`/`typecheck`/`build`/`test` fast as the repo grows;
  no remote cache is configured yet — add one only if CI time actually becomes a problem.
