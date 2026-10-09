import { apiGet, apiPost, apiDelete } from './api';
import { dateKey } from '../utils/format';

export function weekRange(reference) {
  const ref = reference instanceof Date ? reference : new Date(reference);
  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ref.getDay());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { from: dateKey(start), to: dateKey(end) };
}

export async function fetchWeek(reference = new Date()) {
  const { from, to } = weekRange(reference);
  return fetchMeals(from, to);
}

export async function fetchMeals(from, to, mealType) {
  const qs = `/api/meals?from=${from}&to=${to}${mealType ? `&mealType=${encodeURIComponent(mealType)}` : ''}`;
  const data = await apiGet(qs);
  return data.meals;
}

export async function createMeal(meal) {
  const data = await apiPost('/api/meals', meal);
  return data.meal;
}

export async function deleteMealById(id) {
  const data = await apiDelete(`/api/meals/${id}`);
  return data.deleted;
}
