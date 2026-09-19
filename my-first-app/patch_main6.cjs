const fs = require('fs');
const path = 'src/main.ts';
let content = fs.readFileSync(path, 'utf8');

const oldImports = "import './notifications';\n";
const newImports = "import './notifications';\nimport { showNotificationsScreen } from './notifications';\n";
if (!content.includes(oldImports)) { console.log('IMPORTS_NOT_FOUND'); process.exit(0); }
content = content.replace(oldImports, newImports);

const old = "        } else if (chosen === 'whereami') {\n          showWhereAmI();\n        } else if (chosen) {";
const replacement = "        } else if (chosen === 'whereami') {\n          showWhereAmI();\n        } else if (chosen === 'notifications') {\n          showNotificationsScreen();\n        } else if (chosen) {";
if (!content.includes(old)) { console.log('HANDLER_NOT_FOUND'); process.exit(0); }
content = content.replace(old, replacement);

fs.writeFileSync(path, content);
console.log('PATCHED_OK');
