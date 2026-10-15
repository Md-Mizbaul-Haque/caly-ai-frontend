// Pure failure taxonomy for API errors (no imports — unit-testable in plain
// node and usable from any screen). Every failure maps to one code with a
// fixed meaning so dialogs can branch on it instead of sniffing messages.
function classifyApiError(err) {
  if (!err || typeof err !== 'object') return 'UNKNOWN';
  if (typeof err.code === 'string' && err.code) return err.code;
  if (err.status === 429) return 'RATE_LIMITED';
  if (err.timeout === true) return 'TIMEOUT_WAKE';
  if (err.network === true) return 'UNREACHABLE';
  if (err.status === 401) return 'UNAUTHORIZED';
  if (typeof err.status === 'number') return err.status >= 500 ? 'HTTP_5xx' : 'HTTP_4xx';
  return 'UNKNOWN';
}

// Only these codes get a Retry button: 4xx (except 408/429-style, which the
// backend doesn't emit) and auth failures are fix-actions, not retries.
function isRetryableCode(code) {
  return code === 'UNREACHABLE' || code === 'TIMEOUT_WAKE' || code === 'HTTP_5xx' || code === 'BAD_RESPONSE';
}

module.exports = { classifyApiError, isRetryableCode };
