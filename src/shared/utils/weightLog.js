// Pure helpers for the Log Weight sheet (validation + input sanitizing).
// Kept framework-free + CommonJS so they run under node --test like foodScale.js.

const MIN_LBS = 20;
const MAX_LBS = 1000;

// Strip everything except digits and dots, then keep only the FIRST dot so
// "13..2." becomes "13.2" instead of silently parsing as 13 via parseFloat.
function sanitizeDecimalInput(v) {
  const cleaned = String(v ?? '').replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
}

function parseWeight(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const text = sanitizeDecimalInput(v);
  if (!text || text === '.') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function isValidWeight(n) {
  return typeof n === 'number' && Number.isFinite(n) && n >= MIN_LBS && n <= MAX_LBS;
}

// Goal is optional: only send it when it parses, is in range, and actually
// differs from the stored goal — avoids a redundant PUT on every weight log.
function shouldSendGoal(goalText, currentGoal) {
  const n = parseWeight(goalText);
  if (n == null || !isValidWeight(n)) return false;
  return n !== Number(currentGoal);
}

module.exports = { MIN_LBS, MAX_LBS, sanitizeDecimalInput, parseWeight, isValidWeight, shouldSendGoal };
