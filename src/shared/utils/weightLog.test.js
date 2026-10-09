const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const W = require('./weightLog');

describe('sanitizeDecimalInput', () => {
  it('strips non-numeric chars and collapses to a single dot', () => {
    assert.equal(W.sanitizeDecimalInput('132.3'), '132.3');
    assert.equal(W.sanitizeDecimalInput('13..2.'), '13.2');
    assert.equal(W.sanitizeDecimalInput('1a3b.2c'), '13.2');
    assert.equal(W.sanitizeDecimalInput(''), '');
    assert.equal(W.sanitizeDecimalInput(null), '');
  });
});

describe('parseWeight', () => {
  it('parses sanitized input, rejects empties and garbage', () => {
    assert.equal(W.parseWeight('132.3'), 132.3);
    assert.equal(W.parseWeight('13..2.'), 13.2);
    assert.equal(W.parseWeight(''), null);
    assert.equal(W.parseWeight('.'), null);
    assert.equal(W.parseWeight('abc'), null);
    assert.equal(W.parseWeight(150), 150);
    assert.equal(W.parseWeight(NaN), null);
  });
});

describe('isValidWeight', () => {
  it('accepts 20..1000 lbs inclusive', () => {
    assert.equal(W.isValidWeight(20), true);
    assert.equal(W.isValidWeight(1000), true);
    assert.equal(W.isValidWeight(132.3), true);
    assert.equal(W.isValidWeight(19.9), false);
    assert.equal(W.isValidWeight(1000.1), false);
    assert.equal(W.isValidWeight(NaN), false);
    assert.equal(W.isValidWeight(null), false);
  });
});

describe('shouldSendGoal', () => {
  it('sends only when changed, valid, and in range', () => {
    assert.equal(W.shouldSendGoal('140', 132.3), true);
    assert.equal(W.shouldSendGoal('132.3', 132.3), false);
    assert.equal(W.shouldSendGoal('', 132.3), false);
    assert.equal(W.shouldSendGoal('abc', 132.3), false);
    assert.equal(W.shouldSendGoal('10', 132.3), false);
    assert.equal(W.shouldSendGoal('140', null), true);
  });
});
