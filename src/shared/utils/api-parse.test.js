/* global __dirname:readonly */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'api.js'), 'utf8');

// Regression lock for the "Signed in but nothing happens" login bug:
// EXPO_PUBLIC_API_URL pointed at the Metro dev server (port 8081), which
// answers its own HTML 200 for ANY path. The old success path swallowed the
// JSON parse failure of that HTML as {} — login then toasted success with no
// token and no user, and the route guard never navigated.
describe('api.js 2xx response parsing', () => {
  it('never swallows an unparseable success body into {}', () => {
    // parseError still uses .catch(() => ({})) for 4xx/5xx bodies — that is
    // fine, it builds its own message. The lock targets the SUCCESS path:
    // the old `return res.json().catch(() => ({}))` on the 2xx branch.
    assert.doesNotMatch(src, /return res\.json\(\)\.catch\(\(\) => \(\{\}\)\)/,
      "the silent success-path fallback is the bug — it must stay gone");
  });
  it('parses 2xx bodies explicitly and fails as NON_JSON with a pointer to EXPO_PUBLIC_API_URL', () => {
    assert.match(src, /JSON\.parse\(text\)/, 'success bodies must be parsed explicitly');
    assert.match(src, /NON_JSON/, 'non-JSON 2xx must surface with a diagnosable code');
    assert.match(src, /EXPO_PUBLIC_API_URL/, 'the error must tell the user what to check');
  });
});
