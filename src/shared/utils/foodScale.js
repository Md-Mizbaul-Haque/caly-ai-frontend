// Pure helpers for the Log food flow (catalog values are per 100g).
// Kept framework-free + CommonJS so they run under node --test like nutrition.js.

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function scaleMacros(food, grams) {
  return scaleByFactor(food, (Number(grams) || 0) / 100);
}

function scaleByFactor(food, factor) {
  const f = Number(factor) || 0;
  return {
    kcal: Math.round((Number(food.kcal) || 0) * f),
    protein: round1((Number(food.protein) || 0) * f),
    carbs: round1((Number(food.carbs) || 0) * f),
    fat: round1((Number(food.fat) || 0) * f),
  };
}

function clampGrams(g) {
  const n = Math.floor(Number(g) || 0);
  return Math.min(2000, Math.max(10, n));
}

function defaultMealType(hour) {
  const h = Number(hour);
  if (h >= 5 && h < 11) return 'Breakfast';
  if (h >= 11 && h < 15) return 'Lunch';
  if (h >= 15 && h < 22) return 'Dinner';
  return 'Snack';
}

// Distinct foods from the user's logged meals, most recent first.
// Matching is case-insensitive so "Oatmeal" and "oatmeal " collapse.
function recentFoods(meals, limit = 10) {
  const seen = new Map();
  const sorted = [...(meals || [])].sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
  );
  for (const m of sorted) {
    const key = (m.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.set(key, {
      name: (m.name || '').trim(),
      kcal: m.kcal,
      protein: m.protein || 0,
      carbs: m.carbs || 0,
      fat: m.fat || 0,
      imageUrl: m.imageUrl || null,
      mealType: m.mealType || 'Snack',
      loggedAt: m.loggedAt,
    });
    if (seen.size >= limit) break;
  }
  return [...seen.values()];
}

module.exports = { scaleMacros, scaleByFactor, clampGrams, defaultMealType, recentFoods };
