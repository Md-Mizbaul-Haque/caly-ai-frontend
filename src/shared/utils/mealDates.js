// Pure calendar math in a user zone (no imports — safe for node --test).
// mealsApi re-exports these so the app and the tests share one implementation.

import { dateKey, resolveTimeZone, UTC } from './format.js';

// { y, m, d, weekday } (Sun=0..Sat=6) of `instant` in `timeZone`.
export function zonedParts(instant, timeZone) {
  const tz = resolveTimeZone(timeZone);
  const d = instant instanceof Date ? instant : new Date(instant);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { y: +parts.year, m: +parts.month, d: +parts.day, weekday };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// Add `delta` calendar days to a zoned YMD triple (noon-anchored UTC math
// keeps DST transitions from slipping the date).
function addDays(y, m, d, delta) {
  const t = new Date(Date.UTC(y, m - 1, d + delta, 12));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

// Sun..Sat week containing `reference` in `timeZone`, as YYYY-MM-DD.
// Defaults preserve the old device-local behavior.
export function weekRange(reference, timeZone) {
  if (timeZone === undefined || timeZone === null) {
    const ref = reference instanceof Date ? reference : new Date(reference);
    const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ref.getDay());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return { from: dateKey(start), to: dateKey(end) };
  }
  const tz = resolveTimeZone(timeZone);
  const ref = reference instanceof Date ? reference : new Date(reference);
  const { y, m, d, weekday } = zonedParts(ref, tz);
  const s = addDays(y, m, d, -weekday);
  const e = addDays(y, m, d, 6 - weekday);
  return { from: `${s.y}-${pad(s.m)}-${pad(s.d)}`, to: `${e.y}-${pad(e.m)}-${pad(e.d)}` };
}

// Query path for GET /api/meals. The zone travels explicitly so the server
// interprets from/to in the user's calendar (UTC when unset).
export function buildMealsPath(from, to, mealType, timeZone) {
  const tz = timeZone === undefined || timeZone === null ? UTC : resolveTimeZone(timeZone);
  let path = `/api/meals?from=${from}&to=${to}&tz=${encodeURIComponent(tz)}`;
  if (mealType) path += `&mealType=${encodeURIComponent(mealType)}`;
  return path;
}
