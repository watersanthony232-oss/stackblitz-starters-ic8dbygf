const t = require('fs').readFileSync('node_modules/@evenrealities/even_hub_sdk/README.md', 'utf8').split('\n');
const i = t.findIndex(l => l.includes('waitForEvenAppBridge'));
console.log('index', i);
console.log(t.slice(Math.max(0, i - 5), i + 30).join('\n'));
