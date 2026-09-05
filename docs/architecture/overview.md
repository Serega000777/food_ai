# Архитектура

## Монорепо

```
apps/
  api/            NestJS backend — единственный источник истины для домена и расчётов
  miniapp/        React + Vite, первый (и пока единственный) клиент (ADR 0009)
packages/
  contracts/      Zod-схемы + типы, общие для api и клиентов (ADR 0005)
  domain/         чистые доменные правила (ADR 0008: initial goal formula)
  ui-tokens/      design tokens — CSS custom properties (ADR 0009)
  config/         общий tsconfig/eslint/prettier
infrastructure/
  docker/         локальный dev-стек (сейчас: postgres)
  migrations/     SQL-миграции Drizzle
```

Пакеты `nutrition`, `ai`, `analytics`, `test-utils` — целевая структура (master prompt
§4), создаются вместе с фазой, которой они реально нужны. Telegram initData
verification (`apps/api/src/modules/auth/telegram-init-data.ts`) намеренно НЕ вынесен в
отдельный `packages/telegram` — единственный потребитель сейчас apps/api; вынесение
оправдано, когда появится второй потребитель (например, admin), не раньше:

| Пакет        | Появляется в          | Назначение                                                                   |
| ------------ | --------------------- | ---------------------------------------------------------------------------- |
| `nutrition`  | Phase 3               | nutrient conversions, meal/day totals — детерминированные, unit-tested       |
| `ai`         | Phase 4               | `VisionProvider`/`TextMealParser` интерфейсы + normalization + mock provider |
| `analytics`  | Phase 6               | типизированные события                                                       |
| `test-utils` | по мере необходимости | общие тестовые хелперы                                                       |

## Границы модулей (ADR 0001)

Backend — модульный монолит. Модуль не обращается к репозиториям/сущностям другого
модуля напрямую — только через экспортируемый сервис. Внешние системы (Telegram,
vision/LLM-провайдеры, nutrition datasets, object storage) — только через интерфейсы,
определённые в своём модуле/пакете, никогда напрямую из доменного кода.

## Ключевые pipeline'ы (реализуются по фазам)

**Nutrition pipeline** (master prompt §7) — vision-модель никогда не источник итоговой
калорийности:

```
IMAGE/TEXT → AI extracts foods + portion + confidence
  → food matching → canonical food record
  → Nutrition Engine → final structured nutrients
  → clarification/correction → confirmed meal
```

**Photo analysis state machine** (Phase 4, технический документ §14):

```
DRAFT → UPLOADING → QUEUED → ANALYZING → MATCHING
  → NEEDS_CLARIFICATION | READY_TO_CONFIRM → CONFIRMED
```

Failure states: `UPLOAD_FAILED`, `ANALYSIS_FAILED`, `MATCH_FAILED`, `EXPIRED`, `CANCELLED`.
Все переходы идемпотентны; confirm использует Idempotency-Key.

## Инфраструктура сейчас vs позже (ADR 0006)

| Сейчас (Phase 0–3)            | Добавляется в Phase 4                             |
| ----------------------------- | ------------------------------------------------- |
| Postgres                      | Redis + BullMQ (analyze-meal-photo, cleanup jobs) |
| in-memory `@nestjs/throttler` | S3-compatible object storage (MinIO локально)     |

## Таблица фаз

См. `docs/product/mvp.md` — статус по каждой фазе MVP.
