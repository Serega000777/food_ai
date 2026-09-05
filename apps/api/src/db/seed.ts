import { createDatabase } from "./client";
import { foods } from "./schema";

/**
 * A small starter catalog so manual search/logging works before any external
 * FoodDataProvider (Open Food Facts, Phase 5+) is wired in. Per-100g values are
 * standard, widely published nutrition facts (USDA-style), not a proprietary dataset.
 */
const SEED_FOODS: Array<{
  sourceId: string;
  canonicalName: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
}> = [
  {
    sourceId: "chicken-breast",
    canonicalName: "Куриная грудка",
    caloriesPer100g: 165,
    proteinPer100g: 31,
    fatPer100g: 3.6,
    carbsPer100g: 0,
  },
  {
    sourceId: "chicken-thigh",
    canonicalName: "Куриное бедро без кожи",
    caloriesPer100g: 172,
    proteinPer100g: 20,
    fatPer100g: 9.6,
    carbsPer100g: 0,
  },
  {
    sourceId: "beef",
    canonicalName: "Говядина",
    caloriesPer100g: 250,
    proteinPer100g: 26,
    fatPer100g: 15,
    carbsPer100g: 0,
  },
  {
    sourceId: "salmon",
    canonicalName: "Лосось",
    caloriesPer100g: 208,
    proteinPer100g: 20,
    fatPer100g: 13,
    carbsPer100g: 0,
  },
  {
    sourceId: "cod",
    canonicalName: "Треска",
    caloriesPer100g: 82,
    proteinPer100g: 18,
    fatPer100g: 0.7,
    carbsPer100g: 0,
  },
  {
    sourceId: "egg",
    canonicalName: "Яйцо куриное",
    caloriesPer100g: 155,
    proteinPer100g: 13,
    fatPer100g: 11,
    carbsPer100g: 1.1,
  },
  {
    sourceId: "cottage-cheese",
    canonicalName: "Творог 5%",
    caloriesPer100g: 121,
    proteinPer100g: 17,
    fatPer100g: 5,
    carbsPer100g: 3,
  },
  {
    sourceId: "yogurt",
    canonicalName: "Йогурт натуральный",
    caloriesPer100g: 61,
    proteinPer100g: 3.5,
    fatPer100g: 3.3,
    carbsPer100g: 4.7,
  },
  {
    sourceId: "milk",
    canonicalName: "Молоко 2.5%",
    caloriesPer100g: 52,
    proteinPer100g: 2.8,
    fatPer100g: 2.5,
    carbsPer100g: 4.7,
  },
  {
    sourceId: "rice-cooked",
    canonicalName: "Рис варёный",
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    fatPer100g: 0.3,
    carbsPer100g: 28,
  },
  {
    sourceId: "buckwheat-cooked",
    canonicalName: "Гречка варёная",
    caloriesPer100g: 92,
    proteinPer100g: 3.4,
    fatPer100g: 0.6,
    carbsPer100g: 20,
  },
  {
    sourceId: "oatmeal",
    canonicalName: "Овсянка на воде",
    caloriesPer100g: 71,
    proteinPer100g: 2.5,
    fatPer100g: 1.5,
    carbsPer100g: 12,
  },
  {
    sourceId: "pasta-cooked",
    canonicalName: "Макароны варёные",
    caloriesPer100g: 131,
    proteinPer100g: 5,
    fatPer100g: 1.1,
    carbsPer100g: 25,
  },
  {
    sourceId: "potato-boiled",
    canonicalName: "Картофель варёный",
    caloriesPer100g: 87,
    proteinPer100g: 2,
    fatPer100g: 0.1,
    carbsPer100g: 20,
  },
  {
    sourceId: "bread-wheat",
    canonicalName: "Хлеб пшеничный",
    caloriesPer100g: 265,
    proteinPer100g: 8,
    fatPer100g: 3.2,
    carbsPer100g: 49,
  },
  {
    sourceId: "banana",
    canonicalName: "Банан",
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    fatPer100g: 0.3,
    carbsPer100g: 23,
  },
  {
    sourceId: "apple",
    canonicalName: "Яблоко",
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    fatPer100g: 0.2,
    carbsPer100g: 14,
  },
  {
    sourceId: "avocado",
    canonicalName: "Авокадо",
    caloriesPer100g: 160,
    proteinPer100g: 2,
    fatPer100g: 15,
    carbsPer100g: 9,
  },
  {
    sourceId: "cucumber",
    canonicalName: "Огурец",
    caloriesPer100g: 15,
    proteinPer100g: 0.7,
    fatPer100g: 0.1,
    carbsPer100g: 3.6,
  },
  {
    sourceId: "tomato",
    canonicalName: "Помидор",
    caloriesPer100g: 18,
    proteinPer100g: 0.9,
    fatPer100g: 0.2,
    carbsPer100g: 3.9,
  },
  {
    sourceId: "broccoli-cooked",
    canonicalName: "Брокколи варёная",
    caloriesPer100g: 35,
    proteinPer100g: 2.4,
    fatPer100g: 0.4,
    carbsPer100g: 7,
  },
  {
    sourceId: "olive-oil",
    canonicalName: "Оливковое масло",
    caloriesPer100g: 884,
    proteinPer100g: 0,
    fatPer100g: 100,
    carbsPer100g: 0,
  },
  {
    sourceId: "butter",
    canonicalName: "Сливочное масло",
    caloriesPer100g: 717,
    proteinPer100g: 0.9,
    fatPer100g: 81,
    carbsPer100g: 0.1,
  },
  {
    sourceId: "almonds",
    canonicalName: "Миндаль",
    caloriesPer100g: 579,
    proteinPer100g: 21,
    fatPer100g: 50,
    carbsPer100g: 22,
  },
];

async function main() {
  try {
    process.loadEnvFile("../../.env");
  } catch {
    // no .env file — fine when the environment already has DATABASE_URL (CI, Docker).
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const db = createDatabase(databaseUrl);
  await db
    .insert(foods)
    .values(
      SEED_FOODS.map((food) => ({
        ...food,
        source: "SEED" as const,
        verificationLevel: "VERIFIED" as const,
        caloriesPer100g: food.caloriesPer100g.toString(),
        proteinPer100g: food.proteinPer100g.toString(),
        fatPer100g: food.fatPer100g.toString(),
        carbsPer100g: food.carbsPer100g.toString(),
      })),
    )
    .onConflictDoNothing({ target: [foods.source, foods.sourceId] });

  console.log(`Seeded ${SEED_FOODS.length} foods (existing rows left untouched).`);
  process.exit(0);
}

void main();
