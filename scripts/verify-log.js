const { estimateMock } = require('../src/lib/mockMeals.js');
const e = estimateMock('2 eggs + toast');
if (!(e.kcal > 0)) throw new Error('estimate kcal invalid');
function canSave(name, kcal) { return name.trim().length > 0 && Number(kcal) > 0; }
if (canSave('', 100) !== false) throw new Error('empty name should fail');
if (canSave('Apple', 0) !== false) throw new Error('zero kcal should fail');
if (canSave('Apple', 95) !== true) throw new Error('valid should pass');
console.log('log ok');
