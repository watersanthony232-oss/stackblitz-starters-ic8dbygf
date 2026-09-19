const fs = require('fs');
const path = 'src/main.ts';
let content = fs.readFileSync(path, 'utf8');

const oldImports = "import { showNewsScreen } from './news-screen';\n";
const newImports = oldImports + "import { hideNewsScreen, isNewsScreenVisible } from './news-screen';\n";
if (!content.includes(oldImports)) { console.log('IMPORTS_NOT_FOUND'); process.exit(0); }
content = content.replace(oldImports, newImports);

// Add a DOUBLE_CLICK_EVENT branch to the input handler, alongside the
// existing CLICK/LONG_PRESS/SCROLL branches.
const old = `    } else if (sysEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      if (isChoiceOpen()) choiceNext();
      else selectNext();
    }`;
const replacement = `    } else if (sysEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      if (isChoiceOpen()) choiceNext();
      else selectNext();
    } else if (sysEvent.eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      // Trying to claim double-tap for our own News screen, in place of
      // the native Even Realities double-tap display. Whether this
      // actually overrides the native screen (rather than the system
      // reserving double-tap globally) is unconfirmed - only real-device
      // testing will show if this fires at all.
      if (isNewsScreenVisible()) {
        hideNewsScreen();
      } else {
        showNewsScreen();
      }
    }`;
if (!content.includes(old)) { console.log('OLD_NOT_FOUND'); process.exit(0); }
content = content.replace(old, replacement);

fs.writeFileSync(path, content);
console.log('PATCHED_OK');
