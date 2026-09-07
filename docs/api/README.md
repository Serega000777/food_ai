# API

OpenAPI-контракт появится вместе с первым реальным DTO (Phase 1). Здесь — конвенции,
зафиксированные заранее, потому что от них зависит форма первых же эндпоинтов.

## Конвенции

- Версионирование в пути: `/v1/...`.
- Единый error envelope (`@food-ai/contracts`, `errorEnvelopeSchema`):

  ```json
  { "code": "SOME_ERROR", "message": "Human-readable message", "details": {}, "requestId": "..." }
  ```

- `Idempotency-Key` для retry-prone create/confirm операций — `POST /v1/meals` (AT-015:
  повтор с тем же ключом возвращает исходный meal, не создаёт дубликат). Confirm фото-флоу
  (`POST /v1/meal-analyses/:id/confirm`) идемпотентен по-другому: повторный confirm той же
  analysis возвращает уже созданный meal без Idempotency-Key (AT-004).
- Cursor pagination для длинной истории — появится, когда diary/search реально
  понадобится пагинация (сейчас объём на пользователя мал).
- Никаких raw provider prompts/секретов/стектрейсов в ответах API (master prompt §36) —
  обеспечивается `AllExceptionsFilter`.

## Текущие эндпоинты

| Метод  | Путь                            | Назначение                                                  |
| ------ | ------------------------------- | ----------------------------------------------------------- |
| GET    | `/health`                       | Liveness + проверка соединения с БД (без `/v1`)             |
| POST   | `/v1/auth/telegram`             | Проверка initData, создание/поиск User, выдача сессии       |
| POST   | `/v1/auth/refresh`              | Ротация refresh-токена                                      |
| POST   | `/v1/auth/logout`               | Отзыв сессии                                                |
| GET    | `/v1/me`                        | Текущий user + profile                                      |
| PATCH  | `/v1/me/profile`                | Обновление профиля (онбординг автосохраняет по полям)       |
| POST   | `/v1/goals`                     | Сервер считает и сохраняет план по формуле (ADR 0008)       |
| GET    | `/v1/dashboard`                 | Цель/съедено/осталось на дату + приёмы пищи                 |
| GET    | `/v1/foods/search`              | Поиск по каталогу продуктов (`?q=`)                         |
| POST   | `/v1/meals`                     | Ручное создание приёма пищи (`Idempotency-Key` опционально) |
| PATCH  | `/v1/meals/:id`                 | Редактирование (тип/время/состав)                           |
| DELETE | `/v1/meals/:id`                 | Удаление                                                    |
| GET    | `/v1/diary`                     | Приёмы пищи за локальный день пользователя (`?date=`)       |
| POST   | `/v1/meals/photo`               | Multipart-загрузка фото, создаёт AIAnalysis в очереди       |
| GET    | `/v1/meal-analyses/:id`         | Статус/результат анализа (poll, до READY_TO_CONFIRM и т.п.) |
| POST   | `/v1/meal-analyses/:id/refine`  | Исправление свободным текстом (mock — простой парсер грамм) |
| POST   | `/v1/meal-analyses/:id/confirm` | Подтверждение → создаёт MealEntry (идемпотентно, AT-004)    |

Все, кроме `/health`, требуют `Authorization: Bearer <accessToken>`.

## Запланированные эндпоинты (master prompt §30)

Полный список — в master prompt документа-источника (`03_..._Master_Prompt.docx`, §30).
Следующие в очереди (Phase 6): `GET /v1/recent-meals`, `POST /v1/weights`, `GET /v1/progress`.
