import { GoogleGenAI } from "@google/genai";

import type { MealVisionResult } from "./schema";
import type { ImageInput, PersonalContext, RefineInput, VisionProvider } from "./types";

const DEFAULT_MODEL = "gemini-3.8-flash";
const DEFAULT_TIMEOUT_MS = 20_000;

export interface GeminiVisionProviderOptions {
  apiKey: string;
  /** Gemini model identifiers move fast — verified against
   * https://ai.google.dev/gemini-api/docs/models on 2026-09-07 (ADR 0014). Override
   * via env rather than editing code when Google ships a newer Flash model. */
  model?: string;
  timeoutMs?: number;
}

/**
 * Confirmed against the installed `@google/genai@2.21.0` type definitions directly
 * (not just the docs prose, which described a different, unrelated `interactions`
 * API for this SDK version) — `ai.models.generateContent()` is the real call shape.
 * Gemini supports only a subset of JSON Schema (ADR 0014); this mirrors
 * `mealVisionResultSchema` using just that subset.
 */
const MEAL_VISION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    schemaVersion: { type: "string" },
    dishName: { type: "string" },
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          estimatedGrams: { type: "number" },
          gramRange: {
            type: "array",
            items: { type: "number" },
            minItems: 2,
            maxItems: 2,
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          hiddenCalorieRisk: { type: "boolean" },
        },
        required: ["label", "estimatedGrams", "gramRange", "confidence"],
      },
    },
    overallConfidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["schemaVersion", "items", "overallConfidence"],
};

// The whole product/catalog is Russian-first (no i18n layer exists elsewhere yet) —
// `context.locale` isn't threaded into the prompt for the same reason it isn't used
// anywhere else in the app. Labels are asked for in Russian specifically so they have
// a real chance of matching the seeded catalog's Russian `canonicalName`s
// (packages/ai's matching stays a simple lookup, ADR 0013 — real fuzzy multi-language
// matching against a large external database is Phase 6+/1.1, not this).
function buildAnalyzePrompt(): string {
  return `Проанализируй фото еды и определи, что на нём изображено.

Для каждого отдельного продукта укажи:
- label: короткое бытовое название на русском языке (например "Куриная грудка", "Рис варёный", "Яйцо куриное"), а не подробное описание
- estimatedGrams: оценка веса порции в граммах
- gramRange: [минимум, максимум] правдоподобного веса в граммах
- confidence: уверенность от 0 до 1
- hiddenCalorieRisk: true, если продукт может скрывать калории, не видные на фото (масло, соус, заправка, сахар)

Также укажи dishName (общее название блюда) и overallConfidence (общая уверенность, 0..1).

Не придумывай продукты, которых не видно на фото. Отвечай только JSON по заданной схеме.`;
}

function buildRefinePrompt(input: RefineInput): string {
  return `Пользователь уточняет ранее распознанное блюдо.

Текущий результат (JSON):
${JSON.stringify(input.previousResult)}

Уточнение пользователя: "${input.correctionText}"

Обнови JSON с учётом уточнения — измени граммы и/или список продуктов, если пользователь
указал на это. Если уточнение не относится к конкретным продуктам или граммам, верни
исходные данные без изменений. Отвечай только JSON по заданной схеме.`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Response text is JS-parsed here but deliberately NOT re-validated against
 * `mealVisionResultSchema` in this file — `apps/api`'s `runAnalysis` already runs
 * every provider's output through `parseMealVisionResult` before trusting it (AT-010,
 * ADR 0005), so duplicating that check per-provider would just be redundant work. */
function parseResponseText(text: string | undefined): MealVisionResult {
  if (!text) throw new Error("Gemini returned an empty response");
  try {
    return JSON.parse(text) as MealVisionResult;
  } catch {
    throw new Error("Gemini response was not valid JSON");
  }
}

export class GeminiVisionProvider implements VisionProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: GeminiVisionProviderOptions) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    this.model = options.model ?? DEFAULT_MODEL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async analyzeMeal(image: ImageInput, _context: PersonalContext): Promise<MealVisionResult> {
    const response = await withTimeout(
      this.client.models.generateContent({
        model: this.model,
        contents: [
          {
            role: "user",
            parts: [
              { text: buildAnalyzePrompt() },
              { inlineData: { data: image.buffer.toString("base64"), mimeType: image.mimeType } },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: MEAL_VISION_RESPONSE_SCHEMA,
        },
      }),
      this.timeoutMs,
      "Gemini analyzeMeal",
    );
    return parseResponseText(response.text);
  }

  async refineMeal(input: RefineInput, _context: PersonalContext): Promise<MealVisionResult> {
    const response = await withTimeout(
      this.client.models.generateContent({
        model: this.model,
        contents: [{ role: "user", parts: [{ text: buildRefinePrompt(input) }] }],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: MEAL_VISION_RESPONSE_SCHEMA,
        },
      }),
      this.timeoutMs,
      "Gemini refineMeal",
    );
    return parseResponseText(response.text);
  }
}
