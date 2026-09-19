const fs = require('fs');
const path = 'src/notifications.ts';
let content = fs.readFileSync(path, 'utf8');
const marker = "// --- Even Hub SDK wiring ---";
const idx = content.indexOf(marker);
if (idx === -1) {
  console.log('MARKER_NOT_FOUND');
} else {
  content = content.slice(0, idx) + `// TODO: wire this up once we confirm how the Even Hub SDK / Even
// Realities app delivers a custom message from MacroDroid into this
// webview. showNotification() above is ready to receive the data as
// soon as that channel is confirmed against the SDK docs or simulator.
`;
  fs.writeFileSync(path, content);
  console.log('PATCHED_OK');
}
