function todayAt(hours, minutes) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export const mockMeals = [
  { id: '3', name: 'Grilled Salmon', kcal: 550, protein: 35, carbs: 40, fat: 28, mealType: 'Lunch', emoji: '🐟', loggedAt: todayAt(12, 37) },
  { id: '2', name: 'Greek Yogurt Parfait', kcal: 220, protein: 18, carbs: 28, fat: 6, mealType: 'Snack', emoji: '🍓', loggedAt: todayAt(10, 15) },
  { id: '1', name: 'Oatmeal + banana', kcal: 320, protein: 10, carbs: 60, fat: 6, mealType: 'Breakfast', emoji: '🥣', loggedAt: todayAt(7, 45) },
];

export const mockStats = { streak: 15 };

export function estimateMock(text) {
  if (!text || !text.trim()) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  return { kcal: 320, protein: 20, carbs: 25, fat: 12 };
}
