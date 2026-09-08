import type { MealEntryDto, MealType } from "@food-ai/contracts";

/** Master prompt §24 design-system component. Shared by Home and Diary — both used to
 * duplicate this markup with their own local `MEAL_TYPE_LABEL`. No photo thumbnail
 * (§24's MealThumbnail): `MealEntryDto` doesn't carry a photo URL for confirmed meals,
 * so an icon-by-type stands in until that's threaded through.
 */
const MEAL_TYPE_META: Record<MealType, { label: string; icon: string }> = {
  BREAKFAST: { label: "Завтрак", icon: "🍳" },
  LUNCH: { label: "Обед", icon: "🍲" },
  DINNER: { label: "Ужин", icon: "🌙" },
  SNACK: { label: "Перекус", icon: "🍎" },
  OTHER: { label: "Другое", icon: "🍽️" },
};

export function MealCard({ meal, onDelete }: { meal: MealEntryDto; onDelete?: () => void }) {
  const meta = MEAL_TYPE_META[meal.mealType];

  return (
    <div className="card meal-card">
      <div className="meal-icon">{meta.icon}</div>
      <div className="meal-card-body">
        <div className="meal-card-header">
          <strong>{meta.label}</strong>
          <span>{Math.round(meal.totalCalories)} ккал</span>
        </div>
        {meal.items.map((item) => (
          <div key={item.id} className="subtitle">
            {item.displayName} · {Math.round(item.grams)} г
          </div>
        ))}
        {onDelete && (
          <button className="back-link" onClick={onDelete}>
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}
