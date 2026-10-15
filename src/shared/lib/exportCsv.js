import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { fetchMeals } from './mealsApi';
import { fetchWeights } from './weightsApi';
import { dateKey } from '../utils/format';

// Last-90-days window for exports (inclusive-ish; DST edges may shift the
// boundary by a day, which is harmless for a personal data dump).
const EXPORT_DAYS = 90;

// RFC 4180 field escaping: quote only when the value contains a comma,
// quote, or line break; double any embedded quotes.
function esc(value) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}

function isoOf(v) {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function dayOf(v, timeZone) {
  return dateKey(v instanceof Date ? v : new Date(v), timeZone) || '';
}

export function buildMealsCsv(meals, timeZone) {
  // Essential columns only — never export ids, userId, imageUrl, emoji, timestamps.
  const rows = (meals || []).map((m) => [
    isoOf(m.loggedAt),
    dayOf(m.loggedAt, timeZone),
    m.name || '',
    m.mealType || '',
    Math.round(Number(m.kcal) || 0),
    Number(m.protein) || 0,
    Number(m.carbs) || 0,
    Number(m.fat) || 0,
  ]);
  return rowsToCsv(
    ['logged_at', 'date', 'name', 'meal_type', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
    rows
  );
}

export function buildWeightsCsv(weights, timeZone) {
  // Essential columns only — never export ids, userId, timestamps.
  const rows = (weights || []).map((w) => [
    isoOf(w.loggedAt),
    dayOf(w.loggedAt, timeZone),
    Number(w.value),
  ]);
  return rowsToCsv(['logged_at', 'date', 'weight_lbs'], rows);
}

// Fetches the last 90 days of real meals + weights, saves one CSV per
// dataset to the phone's document storage (visible in the Files app), and
// opens the OS share sheet so the user instantly sees/opens the file.
// Throws a human-readable message when there is nothing to export, sharing
// is unavailable, or the network fails.
export async function exportMyData({ timeZone } = {}) {
  const to = new Date();
  const from = new Date(to.getTime() - (EXPORT_DAYS - 1) * 86400000);
  const fromKey = dateKey(from, timeZone);
  const toKey = dateKey(to, timeZone);

  const [meals, weights] = await Promise.all([
    fetchMeals(fromKey, toKey, undefined, timeZone),
    fetchWeights(fromKey, toKey, timeZone),
  ]);

  const hasMeals = (meals || []).length > 0;
  const hasWeights = (weights || []).length > 0;
  if (!hasMeals && !hasWeights) {
    throw new Error(`No meals or weight logs in the last ${EXPORT_DAYS} days yet — log something first.`);
  }

  if (!Paths.document) {
    throw new Error("Export isn't available on this platform.");
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  // SDK 57: Directory/File methods are sync; legacy makeDirectoryAsync /
  // writeAsStringAsync throw at runtime, so use create()/write() instead.
  // Document storage (not cache) so the files persist and stay visible in
  // the phone's Files app.
  const dir = new Directory(Paths.document, 'caly-export');
  if (!dir.exists) dir.create();

  function writeCsvFile(name, csv) {
    const file = new File(dir, name);
    if (file.exists) file.delete();
    file.create();
    file.write(csv);
    return file;
  }

  const shared = [];
  const files = [];
  if (hasMeals) {
    const name = `caly-meals-${toKey}.csv`;
    const file = writeCsvFile(name, buildMealsCsv(meals, timeZone));
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Share your meals CSV' });
    shared.push('meals');
    files.push({ kind: 'meals', name, uri: file.uri });
  }
  if (hasWeights) {
    const name = `caly-weights-${toKey}.csv`;
    const file = writeCsvFile(name, buildWeightsCsv(weights, timeZone));
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Share your weights CSV' });
    shared.push('weights');
    files.push({ kind: 'weights', name, uri: file.uri });
  }
  return { meals: hasMeals ? meals.length : 0, weights: hasWeights ? weights.length : 0, shared, files };
}
