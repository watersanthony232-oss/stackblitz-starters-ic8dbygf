const fs = require('fs');
const path = 'src/main.ts';
let content = fs.readFileSync(path, 'utf8');

const oldImports = "import { showWhereAmI, hideWhereAmI } from './whereami';\n";
const newImports = oldImports + "import { fetchSpeedLimitMph } from './speedlimit';\n";
if (!content.includes(oldImports)) { console.log('IMPORTS_NOT_FOUND'); process.exit(0); }
content = content.replace(oldImports, newImports);

const old = `function updateSpeedFromPosition(pos: GeolocationPosition) {
  const mph = pos.coords.speed != null ? metersPerSecondToMph(pos.coords.speed) : 0;
  speedEl.textContent = \`\${mph} mph\`;
  // TODO: speed limit needs a roads-data lookup (Google Maps Roads API) -
  // placeholder until that's wired in.
  limitEl.textContent = \`limit --\`;
}`;

const replacement = `let lastKnownLimitMph: number | null = null;

function updateSpeedFromPosition(pos: GeolocationPosition) {
  const mph = pos.coords.speed != null ? metersPerSecondToMph(pos.coords.speed) : 0;
  speedEl.textContent = \`\${mph} mph\`;
  speedEl.classList.toggle(
    'speed-over-limit',
    lastKnownLimitMph != null && mph >= lastKnownLimitMph
  );

  fetchSpeedLimitMph(pos.coords.latitude, pos.coords.longitude).then((limit) => {
    lastKnownLimitMph = limit;
    limitEl.textContent = limit != null ? \`limit \${limit}\` : 'limit --';
    speedEl.classList.toggle('speed-over-limit', limit != null && mph >= limit);
  });
}`;

if (!content.includes(old)) { console.log('OLD_NOT_FOUND'); process.exit(0); }
content = content.replace(old, replacement);

fs.writeFileSync(path, content);
console.log('PATCHED_OK');
