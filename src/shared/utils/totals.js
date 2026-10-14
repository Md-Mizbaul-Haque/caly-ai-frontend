// Pure nutrition sums. Kept framework-free + CommonJS so it runs under
// node --test like groupMeals.js. One goal source: goalUsed is null when the
// goal is unset/invalid, so callers can render "set your goal" instead of a
// phantom 2000. remaining is null when unset, 0 when over goal.

function num(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function calcTotals(meals, goal) {
  let eaten = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  for (const m of meals || []) {
    // Per-row clamp: a corrupt/cached negative row contributes 0 instead of
    // inflating remaining via (goal - negative).
    eaten += Math.max(0, num(m?.kcal));
    protein += Math.max(0, num(m?.protein));
    carbs += Math.max(0, num(m?.carbs));
    fat += Math.max(0, num(m?.fat));
  }
  const g = Number(goal);
  const goalUsed = Number.isFinite(g) && g > 0 ? g : null;
  if (goalUsed == null) {
    return { eaten, remaining: null, pct: 0, protein, carbs, fat, goalUsed: null };
  }
  const remaining = Math.max(0, goalUsed - eaten);
  const pct = Math.min(100, Math.round((eaten / goalUsed) * 100));
  return { eaten, remaining, pct, protein, carbs, fat, goalUsed };
}

module.exports = { calcTotals };
