// Display formatting for nutrition numbers (calories, macros, targets).
// Guarantees a short, single-line string for ANY finite or non-finite input:
// rounds float garbage (209.70000000001 -> "209.7") and compacts huge values
// (12345 -> "12.3k") so narrow cards can never overflow.
// Kept framework-free + CommonJS so it runs under node --test like foodScale.js.

function trimTo(n, maxDecimals) {
  const d = Math.max(0, Math.min(3, Math.floor(Number(maxDecimals) || 0)));
  return String(Number(n.toFixed(d)));
}

function formatAmount(value, maxDecimals = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}${trimTo(abs / 1_000_000, 1)}M`;
  if (abs >= 10_000) return `${sign}${trimTo(abs / 1000, 1)}k`;
  return `${sign}${trimTo(abs, maxDecimals)}`;
}

module.exports = { formatAmount };
