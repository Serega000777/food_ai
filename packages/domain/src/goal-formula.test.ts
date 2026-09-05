import { describe, expect, it } from "vitest";

import { calculateBmr, calculateInitialGoal } from "./goal-formula";

describe("calculateBmr", () => {
  it("matches the Mifflin-St Jeor formula for a man", () => {
    // 10*82 + 6.25*178 - 5*30 + 5 = 820 + 1112.5 - 150 + 5 = 1787.5
    expect(calculateBmr("male", 82, 178, 30)).toBeCloseTo(1787.5);
  });

  it("matches the Mifflin-St Jeor formula for a woman", () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    expect(calculateBmr("female", 60, 165, 25)).toBeCloseTo(1345.25);
  });
});

describe("calculateInitialGoal", () => {
  const baseInput = {
    sex: "male" as const,
    birthDate: "1996-01-01",
    heightCm: 178,
    currentWeightKg: 82,
    activityLevel: "sedentary" as const,
    now: new Date("2026-01-01T00:00:00Z"),
  };

  it("targets below maintenance for LOSE and above for GAIN, both around MAINTAIN", () => {
    const lose = calculateInitialGoal({ ...baseInput, goalType: "LOSE" });
    const maintain = calculateInitialGoal({ ...baseInput, goalType: "MAINTAIN" });
    const gain = calculateInitialGoal({ ...baseInput, goalType: "GAIN" });

    expect(lose.calorieTarget).toBeLessThan(maintain.calorieTarget);
    expect(gain.calorieTarget).toBeGreaterThan(maintain.calorieTarget);
  });

  it("a faster pace produces a larger deficit than the default pace", () => {
    const defaultPace = calculateInitialGoal({ ...baseInput, goalType: "LOSE" });
    const fastPace = calculateInitialGoal({ ...baseInput, goalType: "LOSE", paceKgPerWeek: 0.75 });

    expect(fastPace.calorieTarget).toBeLessThan(defaultPace.calorieTarget);
  });

  it("never returns a calorie target below the safety floor, even at an aggressive pace", () => {
    const result = calculateInitialGoal({
      sex: "female",
      birthDate: "1996-01-01",
      heightCm: 150,
      currentWeightKg: 45,
      activityLevel: "sedentary",
      goalType: "LOSE",
      paceKgPerWeek: 1,
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(result.calorieTarget).toBeGreaterThanOrEqual(1200);
  });

  it("macros roughly account for the full calorie target", () => {
    const result = calculateInitialGoal({ ...baseInput, goalType: "MAINTAIN" });
    const macroCalories =
      result.proteinTargetG * 4 + result.fatTargetG * 9 + result.carbTargetG * 4;

    expect(macroCalories).toBeCloseTo(result.calorieTarget, -1);
  });

  it("gives more protein per kg for LOSE/GAIN than for MAINTAIN/TRACK", () => {
    const lose = calculateInitialGoal({ ...baseInput, goalType: "LOSE" });
    const maintain = calculateInitialGoal({ ...baseInput, goalType: "MAINTAIN" });

    expect(lose.proteinTargetG).toBeGreaterThan(maintain.proteinTargetG);
  });
});
