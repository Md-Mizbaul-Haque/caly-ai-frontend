const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { classifyApiError, isRetryableCode } = require('../lib/apiErrors');

// Pure failure taxonomy: every API failure maps to one diagnosable code.
describe('classifyApiError', () => {
  it('maps socket failures to UNREACHABLE and timeouts to TIMEOUT_WAKE', () => {
    assert.equal(classifyApiError({ network: true }), 'UNREACHABLE');
    assert.equal(classifyApiError({ timeout: true }), 'TIMEOUT_WAKE');
  });

  it('maps HTTP statuses (401 first, then 5xx vs 4xx)', () => {
    assert.equal(classifyApiError({ status: 401 }), 'UNAUTHORIZED');
    assert.equal(classifyApiError({ status: 503 }), 'HTTP_5xx');
    assert.equal(classifyApiError({ status: 422 }), 'HTTP_4xx');
  });

  it('keeps an already-attached code and degrades junk to UNKNOWN', () => {
    assert.equal(classifyApiError({ code: 'BAD_RESPONSE' }), 'BAD_RESPONSE');
    assert.equal(classifyApiError(null), 'UNKNOWN');
    assert.equal(classifyApiError(new Error('boom')), 'UNKNOWN');
  });

  it('only retryable codes offer Retry', () => {
    for (const code of ['UNREACHABLE', 'TIMEOUT_WAKE', 'HTTP_5xx', 'BAD_RESPONSE']) {
      assert.equal(isRetryableCode(code), true, `${code} must be retryable`);
    }
    for (const code of ['HTTP_4xx', 'UNAUTHORIZED', 'UNKNOWN']) {
      assert.equal(isRetryableCode(code), false, `${code} must not offer Retry`);
    }
  });
});
