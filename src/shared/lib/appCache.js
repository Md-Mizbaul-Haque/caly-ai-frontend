// On-device cache so cold starts paint last-known data instantly.
// Every entry is stamped; reads return null once the TTL lapses so stale
// data (e.g. yesterday's week view) is never shown as fresh.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  user: 'caly.cache.user',
  weekMeals: 'caly.cache.weekMeals',
  weights: 'caly.cache.weights',
  weightGoal: 'caly.cache.weightGoal',
};

const TTL = {
  user: Number.POSITIVE_INFINITY, // revalidated against the server at startup
  weekMeals: 15 * 60 * 1000, // 15 min — keeps a prior day's meals from flashing
  weights: 24 * 60 * 60 * 1000,
  weightGoal: 24 * 60 * 60 * 1000,
};

export async function readCache(key) {
  try {
    const raw = await AsyncStorage.getItem(KEYS[key]);
    if (!raw) return null;
    const { data, fetchedAt } = JSON.parse(raw);
    if (Date.now() - fetchedAt > (TTL[key] ?? 0)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeCache(key, data) {
  AsyncStorage
    .setItem(KEYS[key], JSON.stringify({ data, fetchedAt: Date.now() }))
    .catch(() => {});
}

export async function clearAppCache() {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch {
    // best effort — a leftover cache only means a stale first paint
  }
}
