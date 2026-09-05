# Personal Nutrition AI — продуктовый MVP (сжатая версия)

Источники: `01_Personal_Nutrition_AI_Idea_and_Blueprint.docx`,
`02_Personal_Nutrition_AI_Detailed_Technical_Specification.docx`. Этот файл — рабочая
выжимка для разработки, не замена исходным документам при спорных решениях по UX.

## Позиционирование

Personal Nutrition AI, а не очередной calorie counter. Не «Cal AI на русском» — фото не
конечная ценность, а вход. Конечная ценность: персональная память, адаптивный расчёт,
объяснение питания, минимизация рутины со временем.

## Ключевые UX-принципы

- Zero-friction logging — 80% ежедневных действий за 1–3 касания.
- Never hide the diary — дневник всегда отдельная вкладка.
- Corrections are first-class — исправление AI занимает секунды и является обучающим сигналом.
- Confidence-driven UX — высокая уверенность = минимум вопросов, низкая = уточнение.
- No shame — нейтральный тон, фокус на тренде недели, а не на «провале дня».
- Data trust — LLM не источник калорийности; считает серверный Nutrition Engine.

## Три пути логирования

- **Photo**: Home → Camera → Analyze → AI Result → Confirm.
- **Repeat**: Home → Recent meal → Confirm.
- **Manual/Text**: Home → Text/Manual → Parse/Search → Confirm.

## Nutrition pipeline (критическое правило)

Vision-модель никогда не является источником итоговой калорийности:

```
IMAGE/TEXT → AI extracts foods + portion + confidence
  → food matching → canonical food record
  → Nutrition Engine → final structured nutrients
  → clarification/correction → confirmed meal
```

## Главные USP

1. **Personal Food Memory** — учится привычным блюдам/порциям/брендам/времени.
2. **Confidence AI** — не изображает абсолютную точность; уточняет там, где это влияет на результат.
3. **Nutrition Intelligence** — отвечает не только «что съедено», но и «что происходит с питанием».
4. **Less tracking over time** — чем дольше пользуется, тем меньше ручного ввода.

## Сознательно не в MVP

Социальная сеть, огромный каталог рецептов, workout planner, отдельный fasting tracker,
meditation, магазин добавок, сложные achievements, игровой аватар, десятки
wearables-интеграций, автообучение моделей на пользовательских фото без отдельного
согласия.

## Фазы реализации (master prompt §40)

| Фаза | Состав                                                                                               | Статус |
| ---- | ---------------------------------------------------------------------------------------------------- | ------ |
| 0    | Repo audit, monorepo bootstrap, CI, ADR, backend-скелет + health-check                               | ✅     |
| 1    | DB, миграции, User/Profile/Goal, Telegram auth, session, `/me`                                       | ✅     |
| 2    | Onboarding API/UI, стартовый расчёт цели, Home shell, навигация Mini App                             | —      |
| 3    | Food/Nutrition Engine, ручной ввод еды, Diary, dashboard totals                                      | —      |
| 4    | Object storage, upload, AIAnalysis state machine, очередь, mock VisionProvider, AI Result UI         | —      |
| 5    | Первый реальный AI-провайдер, structured output, matching, Confidence Engine, hidden-calorie вопросы | —      |
| 6    | Recent/frequent meals, WeightLog, progress, analytics events                                         | —      |
| 7    | Hardening: observability, security review, e2e, accessibility, error UX                              | —      |
| 8    | Monetization shell: EntitlementService, paywall после magic moment                                   | —      |

**STOP MVP здесь**, если явно не попросили продолжать. Дальше: 1.1 voice/barcode/recipes,
1.2 Personal Food Memory + Weekly AI Report + AI Coach, 1.3 Adaptive Energy Expenditure,
Native iOS/Android + HealthKit/Health Connect.

## Definition of Done MVP

Полный список критериев — master prompt §41 (в исходном документе). Ключевое: Telegram
auth реально server-validated, AI structured output валидируется, nutrition считается
сервером, correction сохраняет before/after, confirm идемпотентен, тесты/build зелёные,
секретов в репозитории нет.

## Официальные источники (перепроверять перед реализацией, не по памяти)

- Telegram Mini Apps: https://core.telegram.org/bots/webapps
- Open Food Facts API: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- Apple HealthKit (native этап): https://developer.apple.com/documentation/healthkit/
- Android Health Connect (native этап): https://developer.android.com/health-and-fitness/health-connect/get-started
