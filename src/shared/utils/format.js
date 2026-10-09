export const UTC = 'UTC';

// Valid IANA zone or 'UTC' — any situation (missing, blank, unknown)
// falls back to UTC instead of throwing.
export function resolveTimeZone(tz) {
  if (typeof tz !== 'string' || !tz.trim()) return UTC;
  try {
    const canonical = new Intl.DateTimeFormat('en-US', { timeZone: tz.trim() }).resolvedOptions().timeZone;
    return canonical || UTC;
  } catch {
    return UTC;
  }
}

// The device's IANA zone; 'UTC' when it cannot be determined.
export function deviceTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolveTimeZone(tz);
  } catch {
    return UTC;
  }
}

// The calendar zone for this user: their stored zone, else the device zone.
// Unusable values at every level resolve to UTC (via resolveTimeZone).
export function effectiveTimeZone(user) {
  const stored = user && user.timezone;
  if (typeof stored === 'string' && stored.trim()) {
    const resolved = resolveTimeZone(stored);
    if (resolved !== UTC || stored.trim().toUpperCase() === UTC) return resolved;
    // Corrupt stored value — the device zone is the better guess.
    return deviceTimeZone();
  }
  return deviceTimeZone();
}

// 'YYYY-MM-DD' of `value` in `timeZone` (default: device-local, as before).
// Pass the user's effective zone so grouping matches the server's windows.
export function dateKey(value, timeZone) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  if (timeZone === undefined || timeZone === null) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
  const tz = resolveTimeZone(timeZone);
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function formatTime(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m}${ampm}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateShort(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatMonthShort(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return MONTHS[d.getMonth()];
}
