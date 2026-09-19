const fs = require('fs');
const path = 'src/main.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { isMenuOpen, toggleMenu, selectNext, selectPrev, activateSelected } from './menu';\n",
  "import { isMenuOpen, toggleMenu, selectNext, selectPrev, activateSelected } from './menu';\nimport { showNavigationScreen, hideNavigationScreen } from './nav-screen';\n"
);

const old = [
  "      if (isMenuOpen()) {",
  "        const chosen = activateSelected();",
  "        if (chosen) console.log('menu item chosen:', chosen, '(screen not built yet)');",
  "      } else {"
].join('\n');

const replacement = [
  "      if (isMenuOpen()) {",
  "        const chosen = activateSelected();",
  "        if (chosen === 'navigation') {",
  "          showNavigationScreen('driving');",
  "        } else if (chosen) {",
  "          console.log('menu item chosen:', chosen, '(screen not built yet)');",
  "        }",
  "      } else if (document.getElementById('nav-screen') && !document.getElementById('nav-screen')!.classList.contains('hidden')) {",
  "        hideNavigationScreen();",
  "      } else {"
].join('\n');

if (!content.includes(old)) {
  console.log('OLD_NOT_FOUND');
} else {
  content = content.replace(old, replacement);
  fs.writeFileSync(path, content);
  console.log('PATCHED_OK');
}
