import type { MealEntryDto, MealType } from "@food-ai/contracts";

/** Master prompt §24 design-system component. Shared by Home and Diary — both used to
 * duplicate this markup with their own local `MEAL_TYPE_LABEL`. No photo thumbnail
 * (§24's MealThumbnail): `MealEntryDto` doesn't carry a photo URL for confirmed meals,
 * so a colored gradient badge (one hue per meal type) stands in — closer to a real
 * photo card than a flat icon tile until a thumbnail URL is threaded through.
 */
const MEAL_TYPE_META: Record<MealType, { label: string; icon: string; gradient: string }> = {
  BREAKFAST: {
    label: "Завтрак",
    icon: "🍳",
    gradient: "linear-gradient(135deg, #ffd897, #ff9a56)",
  },
  LUNCH: { label: "Обед", icon: "🍲", gradient: "linear-gradient(135deg, #b7e6a5, #3fa564)" },
  DINNER: { label: "Ужин", icon: "🌙", gradient: "linear-gradient(135deg, #a5c4f7, #5b6fd6)" },
  SNACK: { label: "Перекус", icon: "🍎", gradient: "linear-gradient(135deg, #ffb3c1, #e2637a)" },
  OTHER: { label: "Другое", icon: "🍽️", gradient: "linear-gradient(135deg, #d8d4cc, #9c9689)" },
};

export function MealCard({ meal, onDelete }: { meal: MealEntryDto; onDelete?: () => void }) {
  const meta = MEAL_TYPE_META[meal.mealType];

  return (
    <div className="card meal-card">
      <div className="meal-icon" style={{ background: meta.gradient }}>
        {meta.icon}
      </div>
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
