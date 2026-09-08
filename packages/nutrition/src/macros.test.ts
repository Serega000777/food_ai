import { describe, expect, it } from "vitest";

import {
  averageMacros,
  nutrientsForGrams,
  roundMacros,
  subtractMacros,
  sumMacros,
  type Macros,
} from "./macros";

const chickenPer100g: Macros = { calories: 165, proteinG: 31, fatG: 3.6, carbsG: 0 };

describe("nutrientsForGrams", () => {
  it("100g @ 200kcal/100g -> 200 kcal (AT-005)", () => {
    const result = nutrientsForGrams({ calories: 200, proteinG: 0, fatG: 0, carbsG: 0 }, 100);
    expect(result.calories).toBe(200);
  });

  it("150g of the same fixture -> 300 kcal (AT-006)", () => {
    const result = nutrientsForGrams({ calories: 200, proteinG: 0, fatG: 0, carbsG: 0 }, 150);
    expect(result.calories).toBe(300);
  });

  it("scales every macro proportionally to grams", () => {
    const result = nutrientsForGrams(chickenPer100g, 160);
    expect(result.calories).toBeCloseTo(264);
    expect(result.proteinG).toBeCloseTo(49.6);
    expect(result.fatG).toBeCloseTo(5.76);
    expect(result.carbsG).toBe(0);
  });

  it("0 grams yields all-zero nutrients", () => {
    expect(nutrientsForGrams(chickenPer100g, 0)).toEqual({
      calories: 0,
      proteinG: 0,
      fatG: 0,
      carbsG: 0,
    });
  });
});

describe("sumMacros", () => {
  it("sums an empty list to all zeros", () => {
    expect(sumMacros([])).toEqual({ calories: 0, proteinG: 0, fatG: 0, carbsG: 0 });
  });

  it("sums multiple items without rounding intermediate values", () => {
    // Three items whose individual roundings would each shift by 0.5+ — summing the
    // raw floats first and rounding once at the end must not compound that error.
    const items: Macros[] = [
      { calories: 33.4, proteinG: 1.1, fatG: 0.5, carbsG: 2.2 },
      { calories: 33.4, proteinG: 1.1, fatG: 0.5, carbsG: 2.2 },
      { calories: 33.4, proteinG: 1.1, fatG: 0.5, carbsG: 2.2 },
    ];
    const total = sumMacros(items);
    expect(total.calories).toBeCloseTo(100.2);
    expect(roundMacros(total).calories).toBe(100);
  });
});

describe("subtractMacros", () => {
  it("computes remaining = target - consumed", () => {
    const target: Macros = { calories: 2000, proteinG: 150, fatG: 60, carbsG: 200 };
    const consumed: Macros = { calories: 800, proteinG: 60, fatG: 20, carbsG: 90 };
    expect(subtractMacros(target, consumed)).toEqual({
      calories: 1200,
      proteinG: 90,
      fatG: 40,
      carbsG: 110,
    });
  });
});

describe("averageMacros", () => {
  it("divides the sum by the given day count, not the item count", () => {
    // Two logged days, one of which had two meals — averaging by item count (3) would
    // understate a day that happened to have more entries.
    const items: Macros[] = [
      { calories: 600, proteinG: 40, fatG: 20, carbsG: 60 },
      { calories: 600, proteinG: 40, fatG: 20, carbsG: 60 },
      { calories: 800, proteinG: 50, fatG: 25, carbsG: 80 },
    ];
    expect(averageMacros(items, 2)).toEqual({
      calories: 1000,
      proteinG: 65,
      fatG: 32.5,
      carbsG: 100,
    });
  });

  it("returns all zeros when there are no logged days, without dividing by zero", () => {
    expect(averageMacros([], 0)).toEqual({ calories: 0, proteinG: 0, fatG: 0, carbsG: 0 });
  });
});

describe("roundMacros", () => {
  it("rounds every field independently", () => {
    expect(roundMacros({ calories: 100.4, proteinG: 10.5, fatG: 3.49, carbsG: 0 })).toEqual({
      calories: 100,
      proteinG: 11,
      fatG: 3,
      carbsG: 0,
    });
  });
});
