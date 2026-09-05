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
- **Shared**: `packages/contracts` (Zod-схемы и типы, ADR 0005), `packages/domain` (Goal formula, ADR 0008),
  `packages/ui-tokens` (design tokens), `packages/config`.
- Redis/очереди/object storage сознательно не добавлены — только когда появится реальный
  кейс в Phase 4 (ADR 0006).

## Быстрый старт

Требуется Node 20+, pnpm 9+, Docker (для Postgres).

```bash
pnpm install
cp .env.example .env        # заполните TELEGRAM_BOT_TOKEN, JWT_ACCESS_SECRET
pnpm docker:up               # поднимает Postgres в Docker
pnpm db:migrate                # применяет миграции
pnpm dev                         # api на :3000, Vite dev server для apps/miniapp на :5173
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
pnpm test        # unit-тесты (vitest в packages/*, jest в apps/api)
pnpm format      # prettier --write
pnpm db:generate # сгенерировать SQL-миграцию из схемы Drizzle
pnpm db:migrate  # применить миграции к DATABASE_URL
pnpm docker:down # остановить Postgres
```

## Структура репозитория

```
apps/
  api/            NestJS backend
  miniapp/        React + Vite Telegram Mini App
packages/
  contracts/      Zod-схемы и типы, общие для api и клиентов
  domain/         чистые доменные правила (initial goal formula)
  ui-tokens/      design tokens (CSS custom properties)
  config/         общие tsconfig/eslint/prettier
infrastructure/
  docker/         docker-compose (postgres + api)
  migrations/     SQL-миграции (drizzle-kit)
docs/
  architecture/ · api/ · product/ · decisions/
```

Пакеты `nutrition`, `ai`, `analytics`, `test-utils` (целевая структура, master prompt §4)
появляются в репозитории по мере того, как их наполняет соответствующая фаза — не раньше.

## Правила разработки (не переносим в код без причины)

- LLM/vision-модель не является источником пищевой ценности — только AI Vision → Nutrition
  Engine → структурированный результат (ADR 0005, master prompt §7).
- Бизнес-логика не зависит от конкретного AI-провайдера или nutrition-датасета — только
  от интерфейсов-адаптеров `VisionProvider` / `FoodDataProvider` (ADR 0001).
- Redis/очереди/S3 не добавляются "про запас" — только когда появляется реальный кейс
  (ADR 0006).
- Каждое архитектурное решение с альтернативами — ADR в `docs/decisions/`, а не устная
  договорённость.

## Roadmap

См. таблицу фаз в `docs/architecture/overview.md`. Текущий статус: **Phase 2** —
onboarding (API + Mini App), стартовый расчёт цели, Home с пустым состоянием — готово.
