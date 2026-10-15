import { apiGet, apiPost, apiDelete } from './api';

// Case/space-insensitive food identity — same key the backend dedupes on.
export function nameKey(name) {
  return String(name || '').trim().toLowerCase();
}

export async function fetchFavorites() {
  const data = await apiGet('/api/favorites');
  return data.favorites || [];
}

export async function addFavorite(favorite) {
  const data = await apiPost('/api/favorites', favorite);
  return data.favorite;
}

export async function removeFavorite(id) {
  const data = await apiDelete(`/api/favorites/${encodeURIComponent(id)}`);
  return data.deleted;
}
