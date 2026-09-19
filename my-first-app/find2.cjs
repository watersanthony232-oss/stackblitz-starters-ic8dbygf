const t = require('fs').readFileSync('node_modules/@evenrealities/even_hub_sdk/README.md', 'utf8').split('\n');
const idxs = [];
t.forEach((l, i) => { if (l.includes('waitForEvenAppBridge')) idxs.push(i); });
console.log('occurrences at lines:', idxs.join(','));
idxs.forEach(i => {
  console.log('--- context around line', i, '---');
  console.log(t.slice(Math.max(0, i - 3), i + 15).join('\n'));
});
