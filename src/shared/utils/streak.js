// Pure Day-Streak math (no imports — safe for node --test).
// Keys are already-zoned 'YYYY-MM-DD' calendar days, so shifting is plain
// calendar arithmetic (noon-anchored UTC dodges DST month-boundary drift).
// ProgressScreen passes zoned keys in; tests pass literals.

function shiftDayKey(key, delta) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  const d = Math.trunc(Number(delta));
  if (!m || !Number.isFinite(d)) return '';
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + d, 12));
  if (Number.isNaN(t.getTime())) return '';
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(t.getUTCDate()).padStart(2, '0');
  return `${t.getUTCFullYear()}-${mm}-${dd}`;
}

// Consecutive logged days ending today (or yesterday when today is empty —
// the standard "grace" so a streak doesn't read broken mid-day).
// logged: Set/array of 'YYYY-MM-DD'. Returns a count >= 0.
function calcStreak(logged, todayKey) {
  const has = logged instanceof Set
    ? (k) => logged.has(k)
    : (k) => Array.isArray(logged) && logged.includes(k);
  let cursor = todayKey || '';
  if (!cursor) return 0;
  if (!has(cursor)) cursor = shiftDayKey(cursor, -1);
  let count = 0;
  while (cursor && has(cursor)) {
    count += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return count;
}

// Sun..Sat strip for the week containing today.
// shortcut: streak/horizon covers ~365d; longer streaks truncate at the data edge.
function buildWeekStrip({ sundayKey, todayKey, logged, labels } = {}) {
  const list = Array.isArray(labels) && labels.length === 7
    ? labels
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const has = logged instanceof Set
    ? (k) => logged.has(k)
    : (k) => Array.isArray(logged) && logged.includes(k);
  return list.map((label, i) => {
    const key = shiftDayKey(sundayKey, i);
    return { label, key, logged: !!key && has(key), isToday: !!key && key === todayKey };
  });
}

module.exports = { shiftDayKey, calcStreak, buildWeekStrip };
