const fs = require('fs');
const path = 'src/nav-screen.ts';
let content = fs.readFileSync(path, 'utf8');

const oldImports = `import {
  fetchDirections,
  checkForCongestion,
  getHomeAddress,
  type TravelMode,
} from './nav';`;
const newImports = `import {
  fetchDirections,
  checkForCongestion,
  getHomeAddress,
  type TravelMode,
} from './nav';

const GOOGLE_MAPS_API_KEY = 'AIzaSyD-C-e-GREUwp66CY2jpClsKv2Rg-DoUQs';
let currentHeadingDeg = 0;
let headingListenerAttached = false;

function ensureArrowEl(): HTMLDivElement {
  let el = document.getElementById('nav-heading-arrow') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'nav-heading-arrow';
    el.className = 'nav-heading-arrow';
    el.textContent = '\u25B2'; // solid up-pointing triangle
    document.body.appendChild(el);
  }
  return el;
}

function updateArrowRotation() {
  ensureArrowEl().style.transform = \`rotate(\${currentHeadingDeg}deg)\`;
}

// NOTE: standard browser compass heading (DeviceOrientationEvent) is
// untested in this webview - the G2's sensors may only be reachable via
// the Even Hub SDK's own IMU event channel (bridge.imuControl / IMU_DATA_REPORT
// seen in the SDK docs), not this browser API. Flagged for real-device
// testing rather than assumed to work.
function attachHeadingListener() {
  if (headingListenerAttached) return;
  headingListenerAttached = true;
  window.addEventListener('deviceorientationabsolute', (e: any) => {
    if (e.alpha != null) {
      currentHeadingDeg = e.alpha;
      updateArrowRotation();
    }
  });
}

function buildMapUrl(lat: number, lon: number, polyline: string | null): string {
  const params = [
    \`center=\${lat},\${lon}\`,
    'zoom=15',
    'size=240x160',
    \`markers=color:green%7C\${lat},\${lon}\`,
  ];
  if (polyline) {
    params.push(\`path=color:0x00ff66ff%7Cweight:3%7Cenc:\${encodeURIComponent(polyline)}\`);
  }
  params.push(\`key=\${GOOGLE_MAPS_API_KEY}\`);
  return \`https://maps.googleapis.com/maps/api/staticmap?\${params.join('&')}\`;
}

function ensureMapImgEl(): HTMLImageElement {
  let el = document.getElementById('nav-map-img') as HTMLImageElement | null;
  if (!el) {
    el = document.createElement('img');
    el.id = 'nav-map-img';
    el.className = 'nav-map-img';
    document.body.appendChild(el);
  }
  return el;
}`;

if (!content.includes(oldImports)) { console.log('IMPORTS_NOT_FOUND'); process.exit(0); }
content = content.replace(oldImports, newImports);

// Show the map + start heading tracking when the nav screen opens.
const oldShow = `export function showNavigationScreen(mode: TravelMode = 'driving') {
  ensureNavEl().classList.remove('hidden');
  updateNavigation(mode);
  if (pollTimer) clearInterval(pollTimer);
  // Re-check the route every 30s while navigation is on screen.
  pollTimer = setInterval(() => updateNavigation(mode), 30000);
}`;
const newShow = `export function showNavigationScreen(mode: TravelMode = 'driving') {
  ensureNavEl().classList.remove('hidden');
  ensureMapImgEl().classList.remove('hidden');
  ensureArrowEl().classList.remove('hidden');
  attachHeadingListener();
  updateNavigation(mode);
  if (pollTimer) clearInterval(pollTimer);
  // Re-check the route every 30s while navigation is on screen.
  pollTimer = setInterval(() => updateNavigation(mode), 30000);
}`;
if (!content.includes(oldShow)) { console.log('SHOW_NOT_FOUND'); process.exit(0); }
content = content.replace(oldShow, newShow);

// Hide the map when the nav screen closes.
const oldHide = `export function hideNavigationScreen() {
  ensureNavEl().classList.add('hidden');
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}`;
const newHide = `export function hideNavigationScreen() {
  ensureNavEl().classList.add('hidden');
  ensureMapImgEl().classList.add('hidden');
  ensureArrowEl().classList.add('hidden');
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}`;
if (!content.includes(oldHide)) { console.log('HIDE_NOT_FOUND'); process.exit(0); }
content = content.replace(oldHide, newHide);

// Update the map image whenever the route/position updates.
const oldRender = `      render(\`
        \${congestionHtml}
        <div class="nav-line nav-next">\${nextStep ? nextStep.instruction : ''}</div>
        <div class="nav-line nav-eta">\${minutesLeft} min (\${milesLeft} mi) to \${destination}</div>
      \`);`;
const newRender = `      ensureMapImgEl().src = buildMapUrl(pos.coords.latitude, pos.coords.longitude, route.overviewPolyline);

      render(\`
        \${congestionHtml}
        <div class="nav-line nav-next">\${nextStep ? nextStep.instruction : ''}</div>
        <div class="nav-line nav-eta">\${minutesLeft} min (\${milesLeft} mi) to \${destination}</div>
      \`);`;
if (!content.includes(oldRender)) { console.log('RENDER_NOT_FOUND'); process.exit(0); }
content = content.replace(oldRender, newRender);

fs.writeFileSync(path, content);
console.log('PATCHED_OK');
