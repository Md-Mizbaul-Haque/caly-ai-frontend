function calcTotals(meals, goal) {
  const eaten = meals.reduce((s, m) => s + (Number(m.kcal) || 0), 0);
  const protein = meals.reduce((s, m) => s + (Number(m.protein) || 0), 0);
  const carbs = meals.reduce((s, m) => s + (Number(m.carbs) || 0), 0);
  const fat = meals.reduce((s, m) => s + (Number(m.fat) || 0), 0);
  const safeGoal = Math.max(Number(goal) || 2000, 1);
  const pct = Math.min(100, Math.round((Math.max(eaten, 0) / safeGoal) * 100));
  return { eaten: Math.max(eaten, 0), remaining: goal - eaten, pct, protein, carbs, fat };
}
module.exports = { calcTotals };
