# Архитектура

## Монорепо

```
apps/
  api/            NestJS backend — единственный источник истины для домена и расчётов
  miniapp/        React + Vite, первый (и пока единственный) клиент (ADR 0009)
packages/
  contracts/      Zod-схемы + типы, общие для api и клиентов (ADR 0005)
  domain/         чистые доменные правила (ADR 0008: initial goal formula; confidence engine)
  nutrition/      per-100g→граммы конвертации, суммирование БЖУ (ADR 0010)
  ai/             VisionProvider-контракт: deterministic mock + Gemini (ADR 0013, ADR 0014)
  ui-tokens/      design tokens — CSS custom properties (ADR 0009)
  config/         общий tsconfig/eslint/prettier
infrastructure/
  docker/         локальный dev-стек: postgres, redis, minio
  migrations/     SQL-миграции Drizzle
```

Пакеты `analytics`, `test-utils` — целевая структура (master prompt §4), создаются
вместе с фазой, которой они реально нужны. Telegram initData verification
(`apps/api/src/modules/auth/telegram-init-data.ts`) намеренно НЕ вынесен в отдельный
`packages/telegram` — единственный потребитель сейчас apps/api; вынесение оправдано,
когда появится второй потребитель (например, admin), не раньше.

## Границы модулей (ADR 0001)

Backend — модульный монолит. Модуль не обращается к репозиториям/сущностям другого
модуля напрямую — только через экспортируемый сервис. Внешние системы (Telegram,
vision/LLM-провайдеры, nutrition datasets, object storage) — только через интерфейсы,
определённые в своём модуле/пакете, никогда напрямую из доменного кода. `AnalyzeMealPhotoProcessor`
(BullMQ worker) выполняется в том же процессе `apps/api`, не в отдельном `apps/worker`
(ADR 0012) — выделение в отдельный сервис ничего не меняет в контракте, если понадобится.

## Ключевые pipeline'ы

**Nutrition pipeline** (master prompt §7) — vision-модель никогда не источник итоговой
калорийности; общий для фото и ручного ввода:

```
IMAGE/TEXT → AI extracts foods + portion + confidence
  → food matching (packages/domain: decideItemConfidence)
  → canonical Food record → Nutrition Engine (packages/nutrition)
  → final structured nutrients → clarification/correction → confirmed meal
```

**Photo analysis state machine** (технический документ §14, реализовано в Phase 4 на
mock-провайдере, ADR 0013; реальный `VisionProvider` — Gemini, Phase 5, ADR 0014,
выбирается через `AI_PROVIDER_PRIMARY`, по умолчанию всё ещё `mock`): `POST
/v1/meals/photo` загружает и валидирует фото
синхронно (ADR 0011), поэтому `DRAFT`/`UPLOADING`/`UPLOAD_FAILED` объявлены в схеме
для полноты, но не достижимы при текущей стратегии загрузки — запись создаётся сразу
в `QUEUED`:

```
QUEUED → ANALYZING → MATCHING
  → NEEDS_CLARIFICATION | READY_TO_CONFIRM → CONFIRMED
```

Failure states: `ANALYSIS_FAILED`, `MATCH_FAILED` (реализованы); `EXPIRED`/`CANCELLED`
объявлены, но без cleanup-джобы — нечему пока накапливаться настолько долго, чтобы это
понадобилось. Confirm идемпотентен без `Idempotency-Key` — повтор на уже `CONFIRMED`
analysis возвращает существующий meal (AT-004).

**Manual entry** — тот же принцип без AI-звена: пользователь сам выбирает `Food` через
поиск, `POST /v1/meals` использует `Idempotency-Key` (AT-015). Дневные/дашборд-итоги
считаются на лету суммированием `meal_entries`, без отдельной кэш-таблицы (ADR 0010) —
как и без отдельной таблицы микронутриентов.

## Инфраструктура (ADR 0006, ADR 0011, ADR 0012)

| Сервис                        | С какой фазы | Назначение                                           |
| ----------------------------- | ------------ | ---------------------------------------------------- |
| Postgres                      | Phase 0      | основное хранилище                                   |
| Redis + BullMQ                | Phase 4      | очередь `analyze-meal-photo`, bounded retries        |
| MinIO (S3-compatible)         | Phase 4      | приватное хранилище фото + миниатюр                  |
| in-memory `@nestjs/throttler` | Phase 0      | rate limiting (один инстанс API — достаточно на MVP) |

Ничего не добавлено "про запас" — каждый сервис появился в фазе, которая начала его
реально использовать.

## Таблица фаз

См. `docs/product/mvp.md` — статус по каждой фазе MVP.
