// Pure helpers for the meal-history store (no React / storage imports, so
// node --test can load them). Day keys are 'YYYY-MM-DD' strings already in
// the user's calendar zone, which makes plain string comparison correct.

import { dateKey } from './format.js';

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parse(key) {
  const m = KEY_RE.exec(key || '');
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

// key + `delta` calendar days (noon-anchored UTC math, DST-safe).
export function addDaysKey(key, delta) {
  const p = parse(key);
  if (!p) return null;
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d + Number(delta || 0), 12));
  return t.toISOString().slice(0, 10);
}

// Weekday (Sun=0..Sat=6) and day-of-month of a day key.
export function keyParts(key) {
  const p = parse(key);
  if (!p) return { weekday: 0, d: 0 };
  return { weekday: new Date(Date.UTC(p.y, p.m - 1, p.d, 12)).getUTCDay(), d: p.d };
}

// An instant that falls on `key` in `timeZone` (noon UTC is off by a day in
// zones beyond ±12h, so nearby candidates are tried).
export function instantForKey(key, timeZone) {
  const p = parse(key);
  if (!p) return null;
  const base = Date.UTC(p.y, p.m - 1, p.d, 12);
  for (const h of [0, -11, 11]) {
    const d = new Date(base + h * 3600000);
    if (dateKey(d, timeZone) === key) return d;
  }
  return new Date(base);
}

export function mealId(meal) {
  const id = meal && (meal.id ?? meal._id);
  return id == null ? null : String(id);
}

function validRange(r) {
  return Array.isArray(r) && parse(r[0]) && parse(r[1]) && r[0] <= r[1];
}

function sortRanges(ranges) {
  return (ranges || []).filter(validRange).map((r) => [r[0], r[1]]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

// Add [from, to] to a list of covered day ranges; overlapping and adjacent
// ranges merge so the list stays short and sorted.
export function mergeRange(ranges, from, to) {
  const out = [];
  for (const [f, t] of sortRanges([...(ranges || []), [from, to]])) {
    const last = out[out.length - 1];
    if (last && f <= addDaysKey(last[1], 1)) {
      if (t > last[1]) last[1] = t;
    } else {
      out.push([f, t]);
    }
  }
  return out;
}

// Sub-ranges of [from, to] not covered by `ranges`.
export function missingRanges(ranges, from, to) {
  if (!parse(from) || !parse(to) || from > to) return [];
  const gaps = [];
  let cursor = from;
  for (const [f, t] of sortRanges(ranges)) {
    if (t < cursor) continue;
    if (f > to) break;
    if (f > cursor) gaps.push([cursor, addDaysKey(f, -1)]);
    cursor = addDaysKey(t, 1);
    if (cursor > to) return gaps;
  }
  if (cursor <= to) gaps.push([cursor, to]);
  return gaps;
}

export function isCovered(ranges, key) {
  return !!key && (ranges || []).some((r) => key >= r[0] && key <= r[1]);
}

// Drop coverage older than `minKey` (used when persisting a trimmed window).
export function clipRanges(ranges, minKey) {
  return sortRanges(ranges)
    .filter((r) => r[1] >= minKey)
    .map((r) => [r[0] < minKey ? minKey : r[0], r[1]]);
}

// The server list is authoritative for [from, to]: meals already held for
// those days are replaced (so deletions elsewhere disappear), others kept.
export function replaceRange(mealsById, from, to, incoming, timeZone) {
  const next = {};
  for (const [id, m] of Object.entries(mealsById || {})) {
    const k = dateKey(m && m.loggedAt, timeZone);
    if (k && k >= from && k <= to) continue;
    next[id] = m;
  }
  for (const m of incoming || []) {
    const id = mealId(m);
    if (id) next[id] = m;
  }
  return next;
}

// Per-day totals (rings) and per-day meal lists (oldest first).
export function buildDayIndex(meals, timeZone) {
  const totals = {};
  const byDay = {};
  for (const m of meals || []) {
    const k = dateKey(m && m.loggedAt, timeZone);
    if (!k) continue;
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(m);
    if (!totals[k]) totals[k] = { eaten: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
    const t = totals[k];
    t.eaten += Number(m.kcal) || 0;
    t.protein += Number(m.protein) || 0;
    t.carbs += Number(m.carbs) || 0;
    t.fat += Number(m.fat) || 0;
    t.count += 1;
  }
  for (const k of Object.keys(byDay)) {
    byDay[k].sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
  }
  return { totals, byDay };
}
