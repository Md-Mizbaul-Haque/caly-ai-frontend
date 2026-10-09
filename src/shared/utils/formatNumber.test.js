const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatAmount } = require('./formatNumber');

describe('formatAmount', () => {
  it('rounds float garbage and strips trailing zeros', () => {
    assert.equal(formatAmount(209.70000000001), '209.7');
    assert.equal(formatAmount(295.2), '295.2');
    assert.equal(formatAmount(139), '139');
    assert.equal(formatAmount(42.4), '42.4');
    assert.equal(formatAmount(0), '0');
  });

  it('respects maxDecimals, defaulting to 1 and capping at 3', () => {
    assert.equal(formatAmount(404.6, 0), '405');
    assert.equal(formatAmount(12.3456, 2), '12.35');
    assert.equal(formatAmount(12.3456, 99), '12.346');
  });

  it('compacts huge values so cards never overflow', () => {
    assert.equal(formatAmount(9999), '9999');
    assert.equal(formatAmount(10000), '10k');
    assert.equal(formatAmount(12345), '12.3k');
    assert.equal(formatAmount(2500000), '2.5M');
  });

  it('never throws or prints garbage for bad input', () => {
    for (const bad of [NaN, Infinity, -Infinity, undefined, null, 'abc', {}]) {
      assert.equal(formatAmount(bad), '0');
    }
    assert.equal(formatAmount('-5'), '-5');
  });
});
