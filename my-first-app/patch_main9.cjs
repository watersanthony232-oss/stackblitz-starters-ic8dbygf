const fs = require('fs');
const path = 'src/main.ts';
let content = fs.readFileSync(path, 'utf8');

const oldImports = "import { fetchSpeedLimitMph } from './speedlimit';\n";
const newImports = oldImports +
  "import { startVoiceAssistant } from './voice-assistant';\n" +
  "import { isTimerAlerting, dismissTimerAlert } from './timer';\n";
if (!content.includes(oldImports)) { console.log('IMPORTS_NOT_FOUND'); process.exit(0); }
content = content.replace(oldImports, newImports);

// Start the voice assistant alongside everything else at init.
const oldInit = 'startCongestionWatcher();';
const newInit = 'startCongestionWatcher();\nstartVoiceAssistant();';
if (!content.includes(oldInit)) { console.log('INIT_NOT_FOUND'); process.exit(0); }
content = content.replace(oldInit, newInit);

// Add timer-dismiss as the first check in the tap handler, so a tap
// while the timer is alerting dismisses it rather than toggling
// anything else.
const oldTapStart = "    if (sysEvent.eventType === OsEventTypeList.CLICK_EVENT) {\n      if (isChoiceOpen()) {";
const newTapStart = "    if (sysEvent.eventType === OsEventTypeList.CLICK_EVENT) {\n      if (isTimerAlerting()) {\n        dismissTimerAlert();\n      } else if (isChoiceOpen()) {";
if (!content.includes(oldTapStart)) { console.log('TAP_START_NOT_FOUND'); process.exit(0); }
content = content.replace(oldTapStart, newTapStart);

fs.writeFileSync(path, content);
console.log('PATCHED_OK');
