import { describe, expect, it } from "vitest";

import { MockVisionProvider } from "./mock-vision-provider";

const CONTEXT = { locale: "ru", unitSystem: "metric" as const };

describe("MockVisionProvider.analyzeMeal", () => {
  const provider = new MockVisionProvider();

  it("is deterministic — the same image always yields the same result", async () => {
    const image = { buffer: Buffer.from("a-fake-photo"), mimeType: "image/jpeg" };
    const first = await provider.analyzeMeal(image, CONTEXT);
    const second = await provider.analyzeMeal(image, CONTEXT);
    expect(second).toEqual(first);
  });

  it("returns different results for different images (not a constant)", async () => {
    const resultA = await provider.analyzeMeal(
      { buffer: Buffer.from("photo-a"), mimeType: "image/jpeg" },
      CONTEXT,
    );
    const resultB = await provider.analyzeMeal(
      { buffer: Buffer.from("photo-b-totally-different"), mimeType: "image/jpeg" },
      CONTEXT,
    );
    // Not guaranteed for every possible pair (finite scenario pool), but true for
    // these two fixed fixtures — pins the hash-bucketing behavior.
    expect(resultB.dishName).not.toBe(resultA.dishName);
  });

  it("every item label matches a real seeded food name (ADR 0013 — matching stays a lookup)", async () => {
    const SEEDED_NAMES = new Set([
      "Куриная грудка",
      "Рис варёный",
      "Овсянка на воде",
      "Банан",
      "Творог 5%",
      "Огурец",
      "Помидор",
      "Оливковое масло",
    ]);
    const image = { buffer: Buffer.from("check-labels"), mimeType: "image/jpeg" };
    const result = await provider.analyzeMeal(image, CONTEXT);
    for (const item of result.items) {
      expect(SEEDED_NAMES.has(item.label)).toBe(true);
    }
  });
});

describe("MockVisionProvider.refineMeal", () => {
  const provider = new MockVisionProvider();

  it("applies grams parsed from free text positionally to the previous items", async () => {
    const previousResult = {
      schemaVersion: "mock-v1",
      items: [
        {
          label: "Куриная грудка",
          estimatedGrams: 150,
          gramRange: [120, 180] as [number, number],
          confidence: 0.9,
        },
        {
          label: "Рис варёный",
          estimatedGrams: 200,
          gramRange: [160, 240] as [number, number],
          confidence: 0.85,
        },
      ],
      overallConfidence: 0.87,
    };

    const refined = await provider.refineMeal(
      { previousResult, correctionText: "курицы было 200 г, риса 100 г" },
      CONTEXT,
    );

    expect(refined.items[0].estimatedGrams).toBe(200);
    expect(refined.items[1].estimatedGrams).toBe(100);
  });

  it("leaves items unchanged when no gram values can be parsed", async () => {
    const previousResult = {
      schemaVersion: "mock-v1",
      items: [
        {
          label: "Творог 5%",
          estimatedGrams: 150,
          gramRange: [130, 180] as [number, number],
          confidence: 0.9,
        },
      ],
      overallConfidence: 0.9,
    };
    const refined = await provider.refineMeal(
      { previousResult, correctionText: "было немного больше" },
      CONTEXT,
    );
    expect(refined).toEqual(previousResult);
  });
});
