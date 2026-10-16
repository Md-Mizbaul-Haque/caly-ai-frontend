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
  rangeMeals: 60 * 60 * 1000, // 1h — Progress streak/average paints instantly, revalidates silently
  weights: 24 * 60 * 60 * 1000,
  weightGoal: 24 * 60 * 60 * 1000,
  snappyEarlyAccess: Number.POSITIVE_INFINITY, // local opt-in preference, never stale
  planAttention: Number.POSITIVE_INFINITY, // paint instantly, revalidated at startup (same as user)
};

// Per-user namespaced keys (e.g. `weekMeals:abc123`) so account B never
// paints account A's cached meals/weights. Unknown keys resolve to
// `caly.cache.<key>` with the weekMeals TTL.
export function storageKey(key) {
  if (KEYS[key]) return KEYS[key];
  return `caly.cache.${key}`;
}

export function ttlFor(key) {
  if (TTL[key] !== undefined) return TTL[key];
  const base = String(key).split(':')[0];
  return TTL[base] ?? 0;
}

export function scopedKey(base, userKey) {
  return userKey ? `${base}:${userKey}` : base;
}

export async function readCache(key) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(key));
    if (!raw) return null;
    const { data, fetchedAt, owner } = JSON.parse(raw);
    if (Date.now() - fetchedAt > ttlFor(key)) return null;
    // A namespaced entry already isolates owners; a legacy global entry
    // carrying an owner stamp is only valid for that same owner.
    if (owner && key.indexOf(':') === -1 && currentOwner && owner !== currentOwner) return null;
    return data;
  } catch {
    return null;
  }
}

let currentOwner = null;

export function setCacheOwner(owner) {
  currentOwner = owner || null;
}

export function writeCache(key, data) {
  AsyncStorage
    .setItem(storageKey(key), JSON.stringify({ data, fetchedAt: Date.now(), owner: currentOwner }))
    .catch(() => {});
}

export async function clearAppCache() {
  try {
    const all = await AsyncStorage.getAllKeys();
    const ours = all.filter((k) => k === KEYS.user || k.startsWith('caly.cache.'));
    await AsyncStorage.multiRemove(ours);
  } catch {
    // best effort — a leftover cache only means a stale first paint
  }
}
