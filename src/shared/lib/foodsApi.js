import { apiGet } from './api';

export async function searchFoods(q, limit = 20) {
  const data = await apiGet(`/api/foods/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return data.foods || [];
}

export async function fetchFood(fdcId) {
  const data = await apiGet(`/api/foods/${fdcId}`);
  return data.food;
}
