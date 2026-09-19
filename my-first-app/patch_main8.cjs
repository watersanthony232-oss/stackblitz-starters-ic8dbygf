const fs = require('fs');
const path = 'src/main.ts';
let content = fs.readFileSync(path, 'utf8');

const old = `let lastKnownLimitMph: number | null = null;

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

const replacement = `let lastKnownLimitMph: number | null = null;

function ensureSpeedWarningEl(): HTMLDivElement {
  let el = document.getElementById('speed-warning') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'speed-warning';
    el.className = 'speed-warning hidden';
    document.body.appendChild(el);
  }
  return el;
}

function setOverLimit(mph: number, limit: number | null) {
  const isOver = limit != null && mph >= limit;
  speedEl.classList.toggle('speed-over-limit', isOver);
  const warningEl = ensureSpeedWarningEl();
  warningEl.textContent = isOver ? \`\${mph}\` : '';
  warningEl.classList.toggle('hidden', !isOver);
}

function updateSpeedFromPosition(pos: GeolocationPosition) {
  const mph = pos.coords.speed != null ? metersPerSecondToMph(pos.coords.speed) : 0;
  speedEl.textContent = \`\${mph} mph\`;
  setOverLimit(mph, lastKnownLimitMph);

  fetchSpeedLimitMph(pos.coords.latitude, pos.coords.longitude).then((limit) => {
    lastKnownLimitMph = limit;
    limitEl.textContent = limit != null ? \`limit \${limit}\` : 'limit --';
    setOverLimit(mph, limit);
  });
}`;

if (!content.includes(old)) { console.log('OLD_NOT_FOUND'); process.exit(0); }
content = content.replace(old, replacement);

fs.writeFileSync(path, content);
console.log('PATCHED_OK');
