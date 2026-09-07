# Personal Nutrition AI

AI-дневник питания: пользователь добавляет еду по фото, голосом, текстом или
штрихкодом, сервер считает КБЖУ, запоминает привычки и со временем требует всё меньше
ручного ввода. Первая платформа — Telegram Mini App; backend/domain/AI-логика
platform-agnostic, чтобы iOS/Android позже подключились к тому же API без переписывания.
Полная продуктовая идея — `docs/product/mvp.md`, архитектура — `docs/architecture/overview.md`,
обоснования решений — `docs/decisions/`.

## Стек

- **Backend**: NestJS + TypeScript, PostgreSQL, Drizzle ORM. Модульный монолит (ADR 0001, ADR 0003, ADR 0004).
- **Client**: React + Vite Telegram Mini App (ADR 0009); native (Expo/React Native) позже на том же API.
- **Monorepo**: pnpm workspaces + Turborepo (ADR 0002).
- **Shared**: `packages/contracts` (Zod-схемы и типы, ADR 0005), `packages/domain` (Goal formula + Confidence Engine, ADR 0008),
  `packages/nutrition` (граммы → БЖУ, ADR 0010), `packages/ai` (VisionProvider + mock, ADR 0013), `packages/ui-tokens`, `packages/config`.
- **Фото/очередь**: Redis + BullMQ, MinIO (S3-compatible) — добавлены в Phase 4, ровно
  когда появился реальный кейс (ADR 0006, ADR 0011, ADR 0012).

## Быстрый старт

Требуется Node 20+, pnpm 9+, Docker (для Postgres, Redis, MinIO).

```bash
pnpm install
cp .env.example .env        # заполните TELEGRAM_BOT_TOKEN, JWT_ACCESS_SECRET
pnpm docker:up               # поднимает Postgres, Redis, MinIO в Docker
pnpm db:migrate                # применяет миграции
pnpm db:seed                     # стартовый каталог продуктов для ручного ввода
pnpm dev                           # api на :3000, Vite dev server для apps/miniapp на :5173
```

Проверить, что всё поднялось:

```bash
curl http://localhost:3000/health
# {"status":"ok","db":"ok"}
```

Открыть клиент в браузере (Mini App вне Telegram работает только через dev-заглушку
`?mock_init_data=...`, см. `apps/miniapp/src/telegram.ts` — в production такого пути нет):

```bash
pnpm --filter @food-ai/miniapp dev
```

## Частые команды

```bash
pnpm build       # turbo build всех пакетов и приложений
pnpm lint        # eslint по всему монорепо
pnpm typecheck   # tsc --noEmit по всему монорепо
pnpm test        # unit-тесты (vitest в packages/*, jest в apps/api — требует postgres/redis/minio)
pnpm format      # prettier --write
pnpm db:generate # сгенерировать SQL-миграцию из схемы Drizzle
pnpm db:migrate  # применить миграции к DATABASE_URL
pnpm docker:down # остановить Postgres/Redis/MinIO
```

## Структура репозитория

```
apps/
  api/            NestJS backend
  miniapp/        React + Vite Telegram Mini App
packages/
  contracts/      Zod-схемы и типы, общие для api и клиентов
  domain/         чистые доменные правила (initial goal formula, confidence engine)
  nutrition/      per-100g→граммы, суммирование БЖУ — детерминированные, unit-tested
  ai/             VisionProvider-контракт + deterministic mock (ADR 0013)
  ui-tokens/      design tokens (CSS custom properties)
  config/         общие tsconfig/eslint/prettier
infrastructure/
  docker/         docker-compose (postgres, redis, minio, api)
  migrations/     SQL-миграции (drizzle-kit)
docs/
  architecture/ · api/ · product/ · decisions/
```

Пакеты `analytics`, `test-utils` (целевая структура, master prompt §4) появляются в
репозитории по мере того, как их наполняет соответствующая фаза — не раньше.

## Правила разработки (не переносим в код без причины)

- LLM/vision-модель не является источником пищевой ценности — только AI Vision → Nutrition
  Engine → структурированный результат (ADR 0005, master prompt §7).
- Бизнес-логика не зависит от конкретного AI-провайдера или nutrition-датасета — только
  от интерфейсов-адаптеров `VisionProvider` / `FoodDataProvider` (ADR 0001, ADR 0013).
- AI-провайдера ответ всегда проходит runtime-валидацию (`parseMealVisionResult`) перед
  тем, как ему доверять (ADR 0005, AT-010).
- Redis/очереди/S3 не добавляются "про запас" — только когда появляется реальный кейс
  (ADR 0006) — таким кейсом стал Phase 4.
- Каждое архитектурное решение с альтернативами — ADR в `docs/decisions/`, а не устная
  договорённость.

## Roadmap

См. таблицу фаз в `docs/architecture/overview.md`. Текущий статус: **Phase 4** — фото
приёма пищи (upload → очередь → mock AI → сопоставление с каталогом → Confidence Engine
→ исправление текстом → подтверждение) полностью работает end-to-end, включая ручную
проверку в браузере.
