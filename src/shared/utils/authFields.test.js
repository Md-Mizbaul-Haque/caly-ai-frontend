const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  MIN_PASSWORD_LENGTH,
  CODE_LENGTH,
  isValidEmail,
  emailIssue,
  passwordIssue,
  loginPasswordIssue,
  codeIssue,
} = require('./authFields');

describe('authFields email', () => {
  it('accepts real-world addresses and rejects malformed ones', () => {
    assert.equal(isValidEmail('a@b.co'), true);
    assert.equal(isValidEmail('  first.last+tag@sub.example.com  '), true);
    assert.equal(isValidEmail('nope'), false);
    assert.equal(isValidEmail('a@b'), false);
    assert.equal(isValidEmail('a b@c.co'), false);
    assert.equal(isValidEmail(''), false);
  });
  it('stays silent (no message) only for a parsable value', () => {
    assert.equal(emailIssue('a@b.co'), null);
    assert.match(emailIssue('a@b'), /incomplete/);
  });
  it('asks for the field itself when it is empty', () => {
    assert.match(emailIssue(''), /Enter your email/);
    assert.match(emailIssue('   '), /Enter your email/);
  });
});

describe('authFields password', () => {
  it('requires the 8-character minimum to match the server rule', () => {
    assert.equal(MIN_PASSWORD_LENGTH, 8);
    assert.equal(passwordIssue('a'.repeat(8)), null);
    assert.match(passwordIssue('a'.repeat(7)), /at least 8/);
  });
  it('asks for a password when the field is empty', () => {
    assert.match(passwordIssue(''), /Choose a password/);
  });
  it('login never blocks a short legacy password', () => {
    assert.equal(loginPasswordIssue('old1'), null);
    assert.match(loginPasswordIssue(''), /Enter your password/);
  });
});

describe('authFields code', () => {
  it('requires exactly six digits', () => {
    assert.equal(CODE_LENGTH, 6);
    assert.equal(codeIssue('042913'), null);
    assert.match(codeIssue('04291'), /6 digits/);
    assert.match(codeIssue('0429137'), /6 digits/);
    assert.match(codeIssue(''), /Enter the code/);
  });
});
