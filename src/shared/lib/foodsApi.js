import { apiGet } from './api';

// In-memory cache so navigating back to the meal screen paints instantly
// instead of refetching + flashing the loading spinner every visit.
const suggestionsCache = new Map();
const SUGGESTIONS_TTL_MS = 10 * 60 * 1000;

function cacheKey(mealType, limit) {
  return `${mealType}:${limit}`;
}

export function getCachedSuggestions(mealType = 'Breakfast', limit = 10) {
  const hit = suggestionsCache.get(cacheKey(mealType, limit));
  if (!hit || Date.now() - hit.fetchedAt > SUGGESTIONS_TTL_MS) return null;
  return hit.data;
}

export async function searchFoods(q, limit = 20) {
  const data = await apiGet(`/api/foods/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return data.foods || [];
}

// Browse-by-category row: the server filters the catalog by category keywords.
export async function searchFoodsByCategory(category, limit = 20) {
  const data = await apiGet(`/api/foods/search?category=${encodeURIComponent(category)}&limit=${limit}`);
  return data.foods || [];
}

export async function fetchFood(fdcId) {
  const data = await apiGet(`/api/foods/${fdcId}`);
  return data.food;
}

export async function fetchSuggestions(mealType = 'Breakfast', limit = 10) {
  const cached = getCachedSuggestions(mealType, limit);
  if (cached) return cached;
  const data = await apiGet(`/api/foods/suggestions?mealType=${encodeURIComponent(mealType)}&limit=${limit}`);
  const foods = data.foods || [];
  suggestionsCache.set(cacheKey(mealType, limit), { data: foods, fetchedAt: Date.now() });
  return foods;
}

export async function fetchCategories() {
  const data = await apiGet('/api/foods/categories');
  return data.categories || [];
}
