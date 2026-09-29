export const mockMeals = [
  { id: '1', name: 'Oatmeal + banana', kcal: 320, protein: 10, carbs: 60, fat: 6, mealType: 'Breakfast', loggedAt: new Date().toISOString() },
];
export function estimateMock(text) {
  if (!text || !text.trim()) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  return { kcal: 320, protein: 20, carbs: 25, fat: 12 };
}
