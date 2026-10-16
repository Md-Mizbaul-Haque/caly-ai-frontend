// Auth field rules shared by the login / register / verify / forgot screens.
// Pure (no imports) so node --test can require it directly.
//
// Why a single home for these: three screens each carried their own copy of
// the email regex, and the only feedback a user got for a bad value was a CTA
// that silently stayed disabled. The messages below are what those screens now
// show inline, so the wording has exactly one place to change.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const CODE_LENGTH = 6;

function trimmed(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function isValidEmail(email) {
  return EMAIL_RE.test(trimmed(email));
}

// Used after the field is left (blur), never while the user is mid-typing —
// \"a\" on its way to \"a@b.co\" is not a mistake worth shouting about.
function emailIssue(email) {
  const v = trimmed(email);
  if (!v) return 'Enter your email address';
  return EMAIL_RE.test(v) ? null : 'That email address looks incomplete';
}

// Sign-up / reset rule: length only. The server enforces the same 8 (and the
// real policy), so a client-side strength score would only diverge from it.
function passwordIssue(password) {
  if (!password) return 'Choose a password';
  return password.length >= MIN_PASSWORD_LENGTH
    ? null
    : `Use at least ${MIN_PASSWORD_LENGTH} characters`;
}

// Login asks only for \"something was typed\": gating on length would refuse
// legacy passwords created before the 8-character rule existed.
function loginPasswordIssue(password) {
  return password ? null : 'Enter your password';
}

function codeIssue(code) {
  const v = typeof code === 'string' ? code : '';
  if (!v) return 'Enter the code from your email';
  return v.length === CODE_LENGTH ? null : `The code is ${CODE_LENGTH} digits`;
}

module.exports = {
  EMAIL_RE,
  MIN_PASSWORD_LENGTH,
  CODE_LENGTH,
  isValidEmail,
  emailIssue,
  passwordIssue,
  loginPasswordIssue,
  codeIssue,
};
