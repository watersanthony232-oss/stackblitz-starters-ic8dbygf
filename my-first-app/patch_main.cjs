const fs = require('fs');
const path = 'src/main.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. add menu import after the notifications import
content = content.replace(
  "import './notifications';\n",
  "import './notifications';\nimport { isMenuOpen, toggleMenu, selectNext, selectPrev, activateSelected } from './menu';\n"
);

// 2. replace the openMenu() stub function - remove it (menu module owns this now)
content = content.replace(
  `function openMenu() {
  // TODO: build the menu (navigation / translate / notifications / news)
  console.log('long press - open menu (not yet built)');
}

`,
  ''
);

// 3. replace the input handler body
const oldHandler = `  bridge.onEvenHubEvent((event: any) => {
    const sysEvent = event.sysEvent;
    if (!sysEvent) return;
    if (sysEvent.eventType === OsEventTypeList.CLICK_EVENT) {
      toggleDisplay();
    } else if (sysEvent.eventType === OsEventTypeList.LONG_PRESS_EVENT) {
      openMenu();
    }
  });`;

const newHandler = `  bridge.onEvenHubEvent((event: any) => {
    const sysEvent = event.sysEvent;
    if (!sysEvent) return;
    if (sysEvent.eventType === OsEventTypeList.CLICK_EVENT) {
      if (isMenuOpen()) {
        const chosen = activateSelected();
        if (chosen) console.log('menu item chosen:', chosen, '(screen not built yet)');
      } else {
        toggleDisplay();
      }
    } else if (sysEvent.eventType === OsEventTypeList.LONG_PRESS_EVENT) {
      toggleMenu();
    } else if (sysEvent.eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
      selectPrev();
    } else if (sysEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      selectNext();
    }
  });`;

if (!content.includes(oldHandler)) {
  console.log('OLD_HANDLER_NOT_FOUND');
} else {
  content = content.replace(oldHandler, newHandler);
  fs.writeFileSync(path, content);
  console.log('PATCHED_OK');
}
