import { apiGet } from './api';

export async function searchFoods(q, limit = 20) {
  const data = await apiGet(`/api/foods/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return data.foods || [];
}

export async function fetchFood(fdcId) {
  const data = await apiGet(`/api/foods/${fdcId}`);
  return data.food;
}

export async function fetchSuggestions(mealType = 'Breakfast', limit = 10) {
  const data = await apiGet(`/api/foods/suggestions?mealType=${encodeURIComponent(mealType)}&limit=${limit}`);
  return data.foods || [];
}

export async function fetchCategories() {
  const data = await apiGet('/api/foods/categories');
  return data.categories || [];
}

export async function fetchMyFoods(limit = 10) {
  const data = await apiGet(`/api/meals/my-foods?limit=${limit}`);
  return data.foods || [];
}
