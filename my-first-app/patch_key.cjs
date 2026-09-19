const fs = require('fs');
const path = 'src/nav.ts';
let content = fs.readFileSync(path, 'utf8');
const old = "const GOOGLE_MAPS_API_KEY = 'PASTE_YOUR_KEY_HERE';";
const replacement = "const GOOGLE_MAPS_API_KEY = 'AIzaSyD-C-e-GREUwp66CY2jpClsKv2Rg-DoUQs';";
if (!content.includes(old)) {
  console.log('MARKER_NOT_FOUND');
} else {
  content = content.replace(old, replacement);
  fs.writeFileSync(path, content);
  console.log('PATCHED_OK');
}
