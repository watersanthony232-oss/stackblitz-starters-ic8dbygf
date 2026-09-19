const fs = require('fs');
const path = 'src/main.ts';
let content = fs.readFileSync(path, 'utf8');

const oldImports = "import { findNearby, type PoiCategory } from './poi';\n";
const newImports = oldImports +
  "import { startCongestionWatcher, setDivertHandler } from './congestion-watcher';\n";

if (!content.includes(oldImports)) {
  console.log('IMPORTS_NOT_FOUND');
  process.exit(0);
}
content = content.replace(oldImports, newImports);

const old = 'initInputHandling();';
const replacement = [
  'initInputHandling();',
  '',
  "setDivertHandler(() => showNavigationScreen('driving'));",
  'startCongestionWatcher();'
].join('\n');

if (!content.includes(old)) {
  console.log('INIT_CALL_NOT_FOUND');
  process.exit(0);
}
content = content.replace(old, replacement);

fs.writeFileSync(path, content);
console.log('PATCHED_OK');
