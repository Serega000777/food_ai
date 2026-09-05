export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "active" | "very_active";
export type GoalType = "LOSE" | "MAINTAIN" | "GAIN" | "TRACK";

export interface InitialGoalInput {
  sex: Sex;
  /** ISO date (YYYY-MM-DD). */
  birthDate: string;
  heightCm: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  /** Only meaningful for LOSE/GAIN; defaults to a moderate pace (product blueprint
   * §5.6: "Значение по умолчанию должно быть умеренным"). */
  paceKgPerWeek?: number;
  /** Injectable for deterministic tests; defaults to the real current time. */
  now?: Date;
}

export interface InitialGoalResult {
  calorieTarget: number;
  proteinTargetG: number;
  fatTargetG: number;
  carbTargetG: number;
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  active: 1.55,
  very_active: 1.725,
};

const KCAL_PER_KG_BODY_FAT = 7700;
// Never auto-generate an extreme low-calorie target (master prompt §28: "Не создавать
// экстремально низкие calorie targets автоматически") — a floor independent of the
// pace/activity inputs above it.
const MIN_CALORIE_TARGET = 1200;
const DEFAULT_PACE_KG_PER_WEEK = 0.5;
const FAT_SHARE_OF_CALORIES = 0.25;
const PROTEIN_G_PER_KG_MAINTAIN = 1.6;
const PROTEIN_G_PER_KG_LOSE_OR_GAIN = 2.0;

function calculateAge(birthDate: string, now: Date): number {
  const birth = new Date(birthDate);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const hadBirthdayThisYear =
    now.getUTCMonth() > birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() >= birth.getUTCDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

/** Mifflin-St Jeor basal metabolic rate — the most widely validated resting-energy
 * formula for a general adult population without body-composition data. A static,
 * peer-reviewed nutrition-science equation, not a changing SDK/API — not subject to
 * the "verify against current official docs" rule the rest of this project follows. */
export function calculateBmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/**
 * The starting calorie/macro plan shown at the end of onboarding (product blueprint
 * §5.7: "Это стартовая оценка. По мере накопления данных приложение сможет уточнять
 * твою реальную потребность."). Deliberately simple and explainable from BMR + activity
 * + goal pace — MacroFactor-style adaptive adjustment from real intake/weight trend is
 * Phase 1.3 (Adaptive Energy Expenditure), not this formula.
 */
export function calculateInitialGoal(input: InitialGoalInput): InitialGoalResult {
  const now = input.now ?? new Date();
  const age = calculateAge(input.birthDate, now);
  const bmr = calculateBmr(input.sex, input.currentWeightKg, input.heightCm, age);
  const tdee = bmr * ACTIVITY_MULTIPLIER[input.activityLevel];

  const pace = input.paceKgPerWeek ?? DEFAULT_PACE_KG_PER_WEEK;
  const dailyPaceCalories = (pace * KCAL_PER_KG_BODY_FAT) / 7;

  let calorieTarget = tdee;
  if (input.goalType === "LOSE") calorieTarget = tdee - dailyPaceCalories;
  if (input.goalType === "GAIN") calorieTarget = tdee + dailyPaceCalories;
  calorieTarget = Math.max(MIN_CALORIE_TARGET, Math.round(calorieTarget));

  const proteinPerKg =
    input.goalType === "MAINTAIN" || input.goalType === "TRACK"
      ? PROTEIN_G_PER_KG_MAINTAIN
      : PROTEIN_G_PER_KG_LOSE_OR_GAIN;
  const proteinTargetG = Math.round(input.currentWeightKg * proteinPerKg);
  const proteinKcal = proteinTargetG * 4;

  const fatKcal = calorieTarget * FAT_SHARE_OF_CALORIES;
  const fatTargetG = Math.round(fatKcal / 9);

  const carbKcal = Math.max(0, calorieTarget - proteinKcal - fatKcal);
  const carbTargetG = Math.round(carbKcal / 4);

  return { calorieTarget, proteinTargetG, fatTargetG, carbTargetG };
}
