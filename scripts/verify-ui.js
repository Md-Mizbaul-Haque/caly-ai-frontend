const fs = require('fs');
['Card','Button','Chip','ProgressRing','MacroBar','EmptyState'].forEach(n => {
  if (!fs.existsSync(`src/components/ui/${n}.js`)) throw new Error(`missing ${n}.js`);
});
console.log('ui files present');
