// Pure calendar math in a user zone (no imports — safe for node --test).
// mealsApi re-exports these so the app and the tests share one implementation.

import { dateKey, resolveTimeZone, UTC } from './format.js';

// { y, m, d, weekday } (Sun=0..Sat=6) of `instant` in `timeZone`.
// Formatter cached per zone (see format.js): DaySelector calls this per
// pill per render, and a fresh Intl.DateTimeFormat each call janks low-end
// phones.
const zonedPartsFormatterCache = new Map();
export function zonedParts(instant, timeZone) {
  const tz = resolveTimeZone(timeZone);
  const d = instant instanceof Date ? instant : new Date(instant);
  let fmt = zonedPartsFormatterCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });
    zonedPartsFormatterCache.set(tz, fmt);
  }
  const parts = Object.fromEntries(
    fmt
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

// --- Day-strip centering (pure scroll math for DaySelector) ---
//
// The strip carries symmetric edge padding (see edgePadding) so the first
// and last pills can sit at the viewport center like every middle pill.

// Leading/trailing padding that lets an edge item of width `itemW` center
// in a `containerW` viewport. 0 when the item already fills the viewport.
export function edgePadding(containerW, itemW) {
  if (!Number.isFinite(containerW) || !Number.isFinite(itemW)) return 0;
  return Math.max(0, containerW / 2 - itemW / 2);
}

// Scroll-x that puts the item at content offset `x` with width `w` at the
// viewport center. `padLeft` is the applied leading edge padding;
// `contentW` is the full content width (bounds the result to
// [0, contentW - containerW]). With edge padding applied this scrolls
// exactly to the item's x for edge items.
export function centerTarget(x, w, containerW, padLeft, contentW) {
  if (!Number.isFinite(containerW) || containerW <= 0) return 0;
  const pad = Number.isFinite(padLeft) ? padLeft : 0;
  const max = Number.isFinite(contentW) ? Math.max(0, contentW - containerW) : 0;
  const raw = x + pad + w / 2 - containerW / 2;
  return Math.min(Math.max(raw, 0), max);
}

// Key of the pill whose center is closest to the viewport center at the
// current `scrollX` (snap target on swipe release). `layouts` are measured
// { key, x, w } rows in content order; ties prefer the earlier pill.
export function nearestToCenter(layouts, scrollX, containerW, padLeft) {
  if (!Array.isArray(layouts) || layouts.length === 0) return null;
  if (!Number.isFinite(containerW) || containerW <= 0) return layouts[0].key;
  const pad = Number.isFinite(padLeft) ? padLeft : 0;
  const sx = Number.isFinite(scrollX) ? scrollX : 0;
  const mid = sx + containerW / 2;
  let best = null;
  let bestDist = Infinity;
  for (const item of layouts) {
    const dist = Math.abs(item.x + pad + item.w / 2 - mid);
    if (dist < bestDist) {
      bestDist = dist;
      best = item.key;
    }
  }
  return best;
}

// True when a snap scroll is visibly needed. Skipping sub-pixel corrections
// breaks the self-sustaining loop where a programmatic scrollTo re-fires
// momentum events that re-issue the same scrollTo forever.
export function needsSnap(currentX, targetX, epsilon = 1) {
  if (!Number.isFinite(currentX) || !Number.isFinite(targetX)) return false;
  return Math.abs(targetX - currentX) > epsilon;
}

function parseKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  if (!m) return null;
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  if (Number.isNaN(t.getTime())) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

function blockAt(y, m, d, timeZone) {
  const t = new Date(Date.UTC(y, m - 1, d, 12));
  return { date: t, key: dateKey(t, timeZone) };
}

// Rolling day-blocks: `radius` consecutive days on each side of `anchor`
// (a YYYY-MM-DD key or Date, keyed in `timeZone`). The strip renders this
// window and extends it while swiping, so swiping never hits a dead end.
export function buildWindow(anchor, radius, timeZone) {
  const r = Math.floor(Number(radius));
  if (!Number.isFinite(r) || r < 0) return [];
  const tz = resolveTimeZone(timeZone);
  let ymd = null;
  if (typeof anchor === 'string') {
    ymd = parseKey(anchor);
  } else {
    const d = anchor instanceof Date ? anchor : new Date(anchor);
    if (Number.isNaN(d.getTime())) return [];
    const key = dateKey(d, tz);
    ymd = parseKey(key);
  }
  if (!ymd) return [];
  const out = [];
  for (let i = -r; i <= r; i += 1) {
    const t = addDays(ymd.y, ymd.m, ymd.d, i);
    out.push(blockAt(t.y, t.m, t.d, tz));
  }
  return out;
}

// Grow a built window by `count` blocks ('forward' appends after the last
// day, 'backward' prepends before the first). Returns the input unchanged
// for anything unusable — never duplicates keys.
export function extendWindow(days, direction, count, timeZone) {
  if (!Array.isArray(days) || days.length === 0) return days;
  const n = Math.floor(Number(count));
  if (!Number.isFinite(n) || n < 1) return days;
  const tz = resolveTimeZone(timeZone);
  if (direction === 'forward') {
    const last = parseKey(days[days.length - 1].key);
    if (!last) return days;
    const extra = [];
    for (let i = 1; i <= n; i += 1) {
      const t = addDays(last.y, last.m, last.d, i);
      extra.push(blockAt(t.y, t.m, t.d, tz));
    }
    return [...days, ...extra];
  }
  if (direction === 'backward') {
    const first = parseKey(days[0].key);
    if (!first) return days;
    const extra = [];
    for (let i = n; i >= 1; i -= 1) {
      const t = addDays(first.y, first.m, first.d, -i);
      extra.push(blockAt(t.y, t.m, t.d, tz));
    }
    return [...extra, ...days];
  }
  return days;
}
