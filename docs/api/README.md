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

| Метод | Путь      | Назначение                          |
| ----- | --------- | ----------------------------------- |
| GET   | `/health` | Liveness + проверка соединения с БД |

## Запланированные эндпоинты (master prompt §30)

Полный список — в master prompt документа-источника (`03_..._Master_Prompt.docx`, §30).
Первые в очереди (Phase 1): `POST /v1/auth/telegram`, `GET /v1/me`.
