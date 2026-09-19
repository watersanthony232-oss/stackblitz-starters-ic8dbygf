const t = require('fs').readFileSync('node_modules/@evenrealities/even_hub_sdk/README.md', 'utf8').split('\n');
const idxs = [];
t.forEach((l, i) => { if (/OsEventTypeList\.\w*PRESS/i.test(l) && !/LONG_PRESS/i.test(l)) idxs.push(i); });
console.log('single press refs at lines:', idxs.join(','));
idxs.slice(0,3).forEach(i => {
  console.log('--- context', i, '---');
  console.log(t.slice(Math.max(0,i-5), i+5).join('\n'));
});
