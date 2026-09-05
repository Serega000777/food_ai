export interface Macros {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/**
 * grams -> nutrients, from a food's per-100g basis. Master prompt §7 (critical rule):
 * "rounding only at presentation boundary" — this returns full floating-point
 * precision; round only when formatting a value for display (`roundMacros`), never in
 * the middle of a calculation chain (summing many unrounded items is how a recipe of
 * 10 ingredients avoids compounding a rounding error 10 times over).
 */
export function nutrientsForGrams(per100g: Macros, grams: number): Macros {
  const factor = grams / 100;
  return {
    calories: per100g.calories * factor,
    proteinG: per100g.proteinG * factor,
    fatG: per100g.fatG * factor,
    carbsG: per100g.carbsG * factor,
  };
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      proteinG: total.proteinG + item.proteinG,
      fatG: total.fatG + item.fatG,
      carbsG: total.carbsG + item.carbsG,
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );
}

export function subtractMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories - b.calories,
    proteinG: a.proteinG - b.proteinG,
    fatG: a.fatG - b.fatG,
    carbsG: a.carbsG - b.carbsG,
  };
}

/** The one place rounding happens — call this at the API/UI boundary, never earlier. */
export function roundMacros(macros: Macros): Macros {
  return {
    calories: Math.round(macros.calories),
    proteinG: Math.round(macros.proteinG),
    fatG: Math.round(macros.fatG),
    carbsG: Math.round(macros.carbsG),
  };
}
