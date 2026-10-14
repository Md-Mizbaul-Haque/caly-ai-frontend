import { Directory, EncodingType, File, Paths, makeDirectoryAsync, writeAsStringAsync } from 'expo-file-system';
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
  const rows = (weights || []).map((w) => [
    isoOf(w.loggedAt),
    dayOf(w.loggedAt, timeZone),
    Number(w.value),
  ]);
  return rowsToCsv(['logged_at', 'date', 'weight_lbs'], rows);
}

// Fetches the last 90 days of real meals + weights, writes one CSV per
// dataset, and opens the OS share sheet so the files land somewhere useful
// (Files, Drive, email). Throws a human-readable message when there is
// nothing to export, sharing is unavailable, or the network fails.
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

  const cache = Paths.cache;
  if (!cache) {
    throw new Error("Export isn't available on this platform.");
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  const dir = new Directory(cache, 'caly-export');
  try {
    await makeDirectoryAsync(dir.uri, { intermediates: true });
  } catch {
    // Already exists — the writes below surface any real failure.
  }

  const shared = [];
  if (hasMeals) {
    const file = new File(dir, `caly-meals-${toKey}.csv`);
    await writeAsStringAsync(file.uri, buildMealsCsv(meals, timeZone), {
      encoding: EncodingType.UTF8,
    });
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Share your meals CSV' });
    shared.push('meals');
  }
  if (hasWeights) {
    const file = new File(dir, `caly-weights-${toKey}.csv`);
    await writeAsStringAsync(file.uri, buildWeightsCsv(weights, timeZone), {
      encoding: EncodingType.UTF8,
    });
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Share your weights CSV' });
    shared.push('weights');
  }
  return { meals: hasMeals ? meals.length : 0, weights: hasWeights ? weights.length : 0, shared };
}
