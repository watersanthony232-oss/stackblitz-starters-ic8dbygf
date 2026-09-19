const t = require('fs').readFileSync('node_modules/@evenrealities/even_hub_sdk/README.md', 'utf8').split('\n');
const idxs = [];
t.forEach((l, i) => { if (/PRESS_EVENT|touchEvent|TouchEvent|onTouch/i.test(l)) idxs.push(i); });
console.log('occurrences at lines:', idxs.join(','));
// dedupe overlapping windows
const seen = new Set();
idxs.forEach(i => {
  const start = Math.max(0, i - 8);
  const end = i + 20;
  if (seen.has(start)) return;
  seen.add(start);
  console.log('--- context around line', i, '---');
  console.log(t.slice(start, end).join('\n'));
});
