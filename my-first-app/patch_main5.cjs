const fs = require('fs');
const path = 'src/main.ts';
let content = fs.readFileSync(path, 'utf8');

const oldImports = "import { startCongestionWatcher, setDivertHandler } from './congestion-watcher';\n";
const newImports = oldImports + "import { showWhereAmI, hideWhereAmI } from './whereami';\n";

if (!content.includes(oldImports)) { console.log('IMPORTS_NOT_FOUND'); process.exit(0); }
content = content.replace(oldImports, newImports);

const old = "        } else if (chosen) {\n          console.log('menu item chosen:', chosen, '(screen not built yet)');\n        }";
const replacement = "        } else if (chosen === 'whereami') {\n          showWhereAmI();\n        } else if (chosen) {\n          console.log('menu item chosen:', chosen, '(screen not built yet)');\n        }";

if (!content.includes(old)) { console.log('HANDLER_NOT_FOUND'); process.exit(0); }
content = content.replace(old, replacement);

// Also close whereami when tapping the display closed (reuse the same
// closing branch pattern used for nav-screen/poi-results)
const oldClose = "      } else if (document.getElementById('poi-results') && !document.getElementById('poi-results')!.classList.contains('hidden')) {\n        document.getElementById('poi-results')!.classList.add('hidden');\n      } else {";
const replacementClose = "      } else if (document.getElementById('poi-results') && !document.getElementById('poi-results')!.classList.contains('hidden')) {\n        document.getElementById('poi-results')!.classList.add('hidden');\n      } else if (document.getElementById('whereami') && !document.getElementById('whereami')!.classList.contains('hidden')) {\n        hideWhereAmI();\n      } else {";

if (!content.includes(oldClose)) { console.log('CLOSE_HANDLER_NOT_FOUND'); process.exit(0); }
content = content.replace(oldClose, replacementClose);

fs.writeFileSync(path, content);
console.log('PATCHED_OK');
