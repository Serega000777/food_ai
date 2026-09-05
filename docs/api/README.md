# API

OpenAPI-контракт появится вместе с первым реальным DTO (Phase 1). Здесь — конвенции,
зафиксированные заранее, потому что от них зависит форма первых же эндпоинтов.

## Конвенции

- Версионирование в пути: `/v1/...`.
- Единый error envelope (`@food-ai/contracts`, `errorEnvelopeSchema`):

  ```json
  { "code": "SOME_ERROR", "message": "Human-readable message", "details": {}, "requestId": "..." }
  ```

- `Idempotency-Key` для retry-prone create/confirm операций (double-confirm не создаёт
  дубликат meal — AT-004).
- Cursor pagination для длинной истории (diary, дальше — search).
- Никаких raw provider prompts/секретов/стектрейсов в ответах API (master prompt §36).

## Текущие эндпоинты

| Метод | Путь                | Назначение                                            |
| ----- | ------------------- | ----------------------------------------------------- |
| GET   | `/health`           | Liveness + проверка соединения с БД (без `/v1`)       |
| POST  | `/v1/auth/telegram` | Проверка initData, создание/поиск User, выдача сессии |
| POST  | `/v1/auth/refresh`  | Ротация refresh-токена                                |
| POST  | `/v1/auth/logout`   | Отзыв сессии                                          |
| GET   | `/v1/me`            | Текущий user + profile (требует Bearer access token)  |

## Запланированные эндпоинты (master prompt §30)

Полный список — в master prompt документа-источника (`03_..._Master_Prompt.docx`, §30).
Следующие в очереди (Phase 2, onboarding): `PATCH /v1/me/profile`, `POST /v1/goals`,
`GET /v1/dashboard`.
