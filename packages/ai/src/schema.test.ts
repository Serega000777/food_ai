import { describe, expect, it } from "vitest";

import { parseMealVisionResult } from "./schema";

const VALID: unknown = {
  schemaVersion: "mock-v1",
  items: [{ label: "Куриная грудка", estimatedGrams: 150, gramRange: [120, 180], confidence: 0.9 }],
  overallConfidence: 0.9,
};

describe("parseMealVisionResult", () => {
  it("accepts a well-formed result", () => {
    expect(parseMealVisionResult(VALID)).toEqual(VALID);
  });

  it("AT-010: rejects a result with zero items instead of producing an empty meal", () => {
    expect(() => parseMealVisionResult({ ...VALID, items: [] })).toThrow();
  });

  it("AT-010: rejects confidence outside 0..1 rather than silently clamping it", () => {
    const malformed = {
      ...VALID,
      items: [{ ...(VALID as { items: unknown[] }).items[0], confidence: 1.5 }],
    };
    expect(() => parseMealVisionResult(malformed)).toThrow();
  });

  it("AT-010: rejects a completely wrong shape (e.g. a provider returning raw prose)", () => {
    expect(() => parseMealVisionResult("Похоже на курицу с рисом")).toThrow();
  });

  it("AT-010: rejects null/undefined without crashing the caller", () => {
    expect(() => parseMealVisionResult(null)).toThrow();
    expect(() => parseMealVisionResult(undefined)).toThrow();
  });
});
