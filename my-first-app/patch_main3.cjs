const fs = require('fs');
const path = 'src/main.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports for choice picker and poi
const oldImports = "import { showNavigationScreen, hideNavigationScreen } from './nav-screen';\n";
const newImports = oldImports +
  "import { showChoices, isChoiceOpen, choiceNext, choicePrev, confirmChoice, hideChoices } from './choice';\n" +
  "import { findNearby, type PoiCategory } from './poi';\n";

if (!content.includes(oldImports)) {
  console.log('IMPORTS_NOT_FOUND');
  process.exit(0);
}
content = content.replace(oldImports, newImports);

// 2. Add a poi results renderer function (after openMenu removal point - insert
// before "function updateClock" as a safe anchor)
const anchor = 'function updateClock() {';
const poiHelperCode = `function showPoiResults(category: PoiCategory) {
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const results = await findNearby(category, pos.coords.latitude, pos.coords.longitude);
    let el = document.getElementById('poi-results') as HTMLDivElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'poi-results';
      el.className = 'poi-results';
      document.body.appendChild(el);
    }
    if (results.length === 0) {
      el.innerHTML = '<div class="poi-line">No results found.</div>';
    } else {
      el.innerHTML = results
        .map((r) => \`<div class="poi-line">\${r.name} - \${Math.round(r.distanceMeters)}m</div>\`)
        .join('');
    }
    el.classList.remove('hidden');
  });
}

`;

if (!content.includes(anchor)) {
  console.log('ANCHOR_NOT_FOUND');
  process.exit(0);
}
content = content.replace(anchor, poiHelperCode + anchor);

// 3. Update the click handler to route through choice picker first, and
// handle 'navigation' -> mode picker, 'poi' -> category picker.
const oldHandlerBlock = `    if (sysEvent.eventType === OsEventTypeList.CLICK_EVENT) {
      if (isMenuOpen()) {
        const chosen = activateSelected();
        if (chosen === 'navigation') {
          showNavigationScreen('driving');
        } else if (chosen) {
          console.log('menu item chosen:', chosen, '(screen not built yet)');
        }
      } else if (document.getElementById('nav-screen') && !document.getElementById('nav-screen')!.classList.contains('hidden')) {
        hideNavigationScreen();
      } else {
        toggleDisplay();
      }
    } else if (sysEvent.eventType === OsEventTypeList.LONG_PRESS_EVENT) {
      toggleMenu();
    } else if (sysEvent.eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
      selectPrev();
    } else if (sysEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      selectNext();
    }`;

const newHandlerBlock = `    if (sysEvent.eventType === OsEventTypeList.CLICK_EVENT) {
      if (isChoiceOpen()) {
        confirmChoice();
      } else if (isMenuOpen()) {
        const chosen = activateSelected();
        if (chosen === 'navigation') {
          showChoices('Navigation mode', [
            { id: 'driving', label: 'Driving' },
            { id: 'walking', label: 'Walking' },
          ], (mode) => showNavigationScreen(mode));
        } else if (chosen === 'poi') {
          showChoices('Points of Interest', [
            { id: 'petrol', label: 'Petrol stations' },
            { id: 'supermarket', label: 'Supermarkets' },
            { id: 'pub', label: 'Pubs / wine bars' },
          ], (category) => showPoiResults(category));
        } else if (chosen) {
          console.log('menu item chosen:', chosen, '(screen not built yet)');
        }
      } else if (document.getElementById('nav-screen') && !document.getElementById('nav-screen')!.classList.contains('hidden')) {
        hideNavigationScreen();
      } else if (document.getElementById('poi-results') && !document.getElementById('poi-results')!.classList.contains('hidden')) {
        document.getElementById('poi-results')!.classList.add('hidden');
      } else {
        toggleDisplay();
      }
    } else if (sysEvent.eventType === OsEventTypeList.LONG_PRESS_EVENT) {
      if (isChoiceOpen()) {
        hideChoices();
      } else {
        toggleMenu();
      }
    } else if (sysEvent.eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
      if (isChoiceOpen()) choicePrev();
      else selectPrev();
    } else if (sysEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      if (isChoiceOpen()) choiceNext();
      else selectNext();
    }`;

if (!content.includes(oldHandlerBlock)) {
  console.log('HANDLER_NOT_FOUND');
  process.exit(0);
}
content = content.replace(oldHandlerBlock, newHandlerBlock);

fs.writeFileSync(path, content);
console.log('PATCHED_OK');
