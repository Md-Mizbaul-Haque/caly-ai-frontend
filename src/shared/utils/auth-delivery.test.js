const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* global __dirname:readonly */

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
}

// A verification code that never arrives must never be reported as sent: the
// server reports emailSent:false when the send failed, and every screen has to
// pass that on instead of pointing the user at an inbox that stays empty.
describe('auth delivery honesty', () => {
  it('login reports a failed resend instead of "check your email"', () => {
    const session = read('features/auth/session.js');
    const login = /async function handleLogin[\s\S]*?\n  }/.exec(session);
    assert.ok(login, 'handleLogin missing');
    assert.match(login[0], /emailSent === false/, 'the 403 resends a code; a failed resend must be surfaced');
    assert.match(login[0], /toastError/, 'a failed send must reach the user as an error, not a success');
  });

  it('register branches on the server emailSent flag', () => {
    const session = read('features/auth/session.js');
    const register = /async function handleRegister[\s\S]*?\n  }/.exec(session);
    assert.ok(register, 'handleRegister missing');
    assert.match(register[0], /emailSent === false/, 'register must not claim a send that failed');
    assert.match(register[0], /toastError/, 'a failed send must reach the user as an error');
  });

  it('a failed resend returns false so the verify screen keeps Skip hidden', () => {
    const session = read('features/auth/session.js');
    const resend = /async function handleResend[\s\S]*?\n  }/.exec(session);
    assert.ok(resend, 'handleResend missing');
    assert.match(resend[0], /emailSent === false/, 'resend must not claim a send that failed');
    assert.match(resend[0], /return false/, 'a failed resend has to report false to its caller');
  });

  it('the verify screen reveals Skip only after a send that succeeded', () => {
    const screen = read('features/auth/screens/VerifyScreen.js');
    assert.match(screen, /if \(ok\) setSkipVisible\(true\)/, 'Skip must stay hidden when the resend failed');
  });

  it('forgot-password surfaces a failed reset-code send', () => {
    const forgot = read('features/auth/screens/ForgotScreen.js');
    assert.match(forgot, /emailSent === false/, 'a failed reset-code send must be reported, not silently ignored');
  });
});
