import { describe, expect, it } from "vitest";

import { analysisNeedsClarification, decideItemConfidence } from "./confidence";

describe("decideItemConfidence", () => {
  it("requires manual entry for an unmatched item regardless of vision confidence", () => {
    expect(
      decideItemConfidence({
        visionConfidence: 0.99,
        gramRangeWidthRatio: 0.05,
        hiddenCalorieRisk: false,
        matched: false,
      }),
    ).toBe("MANUAL_REQUIRED");
  });

  it("accepts a high-confidence, precise, low-risk match with no noise", () => {
    expect(
      decideItemConfidence({
        visionConfidence: 0.95,
        gramRangeWidthRatio: 0.2,
        hiddenCalorieRisk: false,
        matched: true,
      }),
    ).toBe("ACCEPTABLE");
  });

  it("asks a question for a high-confidence match with hidden-calorie risk, never silently accepts it", () => {
    expect(
      decideItemConfidence({
        visionConfidence: 0.95,
        gramRangeWidthRatio: 0.1,
        hiddenCalorieRisk: true,
        matched: true,
      }),
    ).toBe("ASK_QUESTION");
  });

  it("asks the user to verify a medium-confidence match with no particular risk", () => {
    expect(
      decideItemConfidence({
        visionConfidence: 0.75,
        gramRangeWidthRatio: 0.2,
        hiddenCalorieRisk: false,
        matched: true,
      }),
    ).toBe("VERIFY_ITEM");
  });

  it("a wide portion range downgrades an otherwise-high-confidence match out of ACCEPTABLE", () => {
    expect(
      decideItemConfidence({
        visionConfidence: 0.95,
        gramRangeWidthRatio: 0.6,
        hiddenCalorieRisk: false,
        matched: true,
      }),
    ).toBe("VERIFY_ITEM");
  });

  it("asks a question outright below the medium-confidence threshold", () => {
    expect(
      decideItemConfidence({
        visionConfidence: 0.4,
        gramRangeWidthRatio: 0.1,
        hiddenCalorieRisk: false,
        matched: true,
      }),
    ).toBe("ASK_QUESTION");
  });
});

describe("analysisNeedsClarification", () => {
  it("is false only when every item is ACCEPTABLE", () => {
    expect(analysisNeedsClarification(["ACCEPTABLE", "ACCEPTABLE"])).toBe(false);
  });

  it("is true if any single item needs attention", () => {
    expect(analysisNeedsClarification(["ACCEPTABLE", "VERIFY_ITEM"])).toBe(true);
    expect(analysisNeedsClarification(["ASK_QUESTION"])).toBe(true);
    expect(analysisNeedsClarification(["MANUAL_REQUIRED"])).toBe(true);
  });

  it("is false for an empty item list (nothing to clarify)", () => {
    expect(analysisNeedsClarification([])).toBe(false);
  });
});
