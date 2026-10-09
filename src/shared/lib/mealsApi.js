import { apiGet, apiPost, apiDelete } from './api';
import { weekRange, buildMealsPath } from '../utils/mealDates';
import { effectiveTimeZone } from '../utils/format';

export { weekRange, buildMealsPath };

export async function fetchWeek(reference = new Date(), timeZone) {
  const { from, to } = weekRange(reference, timeZone);
  return fetchMeals(from, to, undefined, timeZone);
}

export async function fetchMeals(from, to, mealType, timeZone) {
  const data = await apiGet(buildMealsPath(from, to, mealType, timeZone));
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

// Convenience: week fetch in the user's calendar zone.
export async function fetchWeekForUser(reference, user) {
  return fetchWeek(reference || new Date(), effectiveTimeZone(user));
}
