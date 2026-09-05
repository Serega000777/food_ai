# Personal Nutrition AI

AI-дневник питания: пользователь добавляет еду по фото, голосом, текстом или
штрихкодом, сервер считает КБЖУ, запоминает привычки и со временем требует всё меньше
ручного ввода. Первая платформа — Telegram Mini App; backend/domain/AI-логика
platform-agnostic, чтобы iOS/Android позже подключились к тому же API без переписывания.
Полная продуктовая идея — `docs/product/mvp.md`, архитектура — `docs/architecture/overview.md`,
обоснования решений — `docs/decisions/`.

## Стек

- **Backend**: NestJS + TypeScript, PostgreSQL, Drizzle ORM. Модульный монолит (ADR 0001, ADR 0003, ADR 0004).
- **Client (Phase 2+)**: React + Vite Telegram Mini App; native (Expo/React Native) позже на том же API.
- **Monorepo**: pnpm workspaces + Turborepo (ADR 0002).
- **Shared**: `packages/contracts` (Zod-схемы и типы — источник правды для DTO, ADR 0005), `packages/config`.
- Redis/очереди/object storage сознательно не добавлены — только когда появится реальный
  кейс в Phase 4 (ADR 0006).

## Быстрый старт

Требуется Node 20+, pnpm 9+, Docker (для Postgres).

```bash
pnpm install
cp .env.example .env
pnpm docker:up       # поднимает Postgres в Docker
pnpm db:migrate      # применяет миграции (пока пустой journal — Phase 0)
pnpm dev             # api на :3000
```

Проверить, что всё поднялось:

```bash
curl http://localhost:3000/health
# {"status":"ok","db":"ok"}
```

## Частые команды

```bash
pnpm build       # turbo build всех пакетов и приложений
pnpm lint        # eslint по всему монорепо
pnpm typecheck   # tsc --noEmit по всему монорепо
pnpm test        # unit-тесты (vitest в packages/*, jest в apps/api)
pnpm format      # prettier --write
pnpm db:generate # сгенерировать SQL-миграцию из схемы Drizzle (появится с Phase 1)
pnpm db:migrate  # применить миграции к DATABASE_URL
pnpm docker:down # остановить Postgres
```

## Структура репозитория

```
apps/
  api/            NestJS backend
  miniapp/        Phase 2 — React + Vite Telegram Mini App
packages/
  contracts/      Zod-схемы и типы, общие для api и клиентов
  config/         общие tsconfig/eslint/prettier
infrastructure/
  docker/         docker-compose (postgres + api)
  migrations/     SQL-миграции (drizzle-kit)
docs/
  architecture/ · api/ · product/ · decisions/
```

Пакеты `domain`, `nutrition`, `ai`, `telegram`, `analytics`, `ui-tokens`, `test-utils`
(целевая структура, master prompt §4) появляются в репозитории по мере того, как их
наполняет соответствующая фаза — не раньше.

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

См. таблицу фаз в `docs/architecture/overview.md`. Текущий статус: **Phase 0** —
монорепо, CI, ADR, backend-скелет с health-check — готово.
