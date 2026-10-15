const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* global __dirname:readonly */

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
}

// Favorites are server-backed: the sheet toggles them via /api/favorites and
// the screen lists them and re-logs through the normal meal API.
describe('favorites feature contract', () => {
  it('log sheet toggles favorites through the API, matched by name', () => {
    const sheet = read('features/meals/components/FoodDetailSheet.js');
    assert.match(sheet, /addFavorite/, 'sheet must be able to add a favorite');
    assert.match(sheet, /removeFavorite/, 'sheet must be able to remove a favorite');
    assert.match(sheet, /nameKey/, 'sheet must match the current food against favorites by name');
  });

  it('favorites screen lists real favorites and logs via the meal API', () => {
    const screen = read('app/favorites.js');
    assert.match(screen, /fetchFavorites/);
    assert.match(screen, /createMeal/);
    assert.match(screen, /FoodDetailSheet/);
    assert.match(screen, /loggedAt/, 'logging from favorites must stamp loggedAt like the tab shell does');
  });

  it('More keeps linking to the favorites screen (guard allows it)', () => {
    const more = read('features/more/screens/MoreScreen.js');
    assert.match(more, /\/favorites/);
    const layout = read('app/_layout.tsx');
    assert.match(layout, /'\/favorites'/);
  });

  it('favoritesApi hits the three favorites endpoints', () => {
    const api = read('shared/lib/favoritesApi.js');
    assert.match(api, /apiGet\('\/api\/favorites'\)/);
    assert.match(api, /apiPost\('\/api\/favorites'/);
    assert.match(api, /apiDelete\(`\/api\/favorites\/\$\{/);
  });
});
