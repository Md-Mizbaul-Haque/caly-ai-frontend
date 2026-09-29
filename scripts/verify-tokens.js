const tokens = require('../src/theme/tokens.js');
if (tokens.colors.primary !== '#FF6B35') throw new Error('primary token mismatch');
if (tokens.radii.card !== 18) throw new Error('radius mismatch');
if (!tokens.colors.cream) throw new Error('cream missing');
console.log('tokens ok');
