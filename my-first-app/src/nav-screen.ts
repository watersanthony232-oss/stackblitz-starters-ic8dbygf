// G2 Companion - Navigation Screen
// Shown when "Navigation" is chosen from the menu. Routes to the saved
// home address for now (destination picker is a later refinement).

import {
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
    el.textContent = '▲'; // solid up-pointing triangle
    document.body.appendChild(el);
  }
  return el;
}

function updateArrowRotation() {
  ensureArrowEl().style.transform = `rotate(${currentHeadingDeg}deg)`;
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
    `center=${lat},${lon}`,
    'zoom=15',
    'size=240x160',
    `markers=color:green%7C${lat},${lon}`,
  ];
  if (polyline) {
    params.push(`path=color:0x00ff66ff%7Cweight:3%7Cenc:${encodeURIComponent(polyline)}`);
  }
  params.push(`key=${GOOGLE_MAPS_API_KEY}`);
  return `https://maps.googleapis.com/maps/api/staticmap?${params.join('&')}`;
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
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

function ensureNavEl(): HTMLDivElement {
  let el = document.getElementById('nav-screen') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'nav-screen';
    el.className = 'nav-screen hidden';
    document.body.appendChild(el);
  }
  return el;
}

function render(html: string) {
  ensureNavEl().innerHTML = html;
}

async function updateNavigation(mode: TravelMode) {
  const destination = getHomeAddress();
  if (!destination) {
    render(`<div class="nav-line">No home address set yet.</div>`);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const route = await fetchDirections(
        pos.coords.latitude,
        pos.coords.longitude,
        destination,
        mode
      );
      if (!route) {
        render(`<div class="nav-line">Couldn't fetch a route right now.</div>`);
        return;
      }

      const nextStep = route.steps[0];
      const minutesLeft = Math.round(
        (route.durationInTrafficSeconds ?? route.durationSeconds) / 60
      );
      const milesLeft = (route.distanceMeters / 1609.34).toFixed(1);

      const congestion = checkForCongestion(route);
      const congestionHtml = congestion
        ? `<div class="nav-alert ${congestion.level}">
             ${congestion.level === 'standstill' ? 'Standstill' : 'Slow traffic'} ahead
             ${congestion.onMotorway ? '(motorway)' : ''} - diversion available
           </div>`
        : '';

      ensureMapImgEl().src = buildMapUrl(pos.coords.latitude, pos.coords.longitude, route.overviewPolyline);

      render(`
        ${congestionHtml}
        <div class="nav-line nav-next">${nextStep ? nextStep.instruction : ''}</div>
        <div class="nav-line nav-eta">${minutesLeft} min (${milesLeft} mi) to ${destination}</div>
      `);
    },
    () => render(`<div class="nav-line">Couldn't get GPS location.</div>`),
    { enableHighAccuracy: true }
  );
}

export function showNavigationScreen(mode: TravelMode = 'driving') {
  ensureNavEl().classList.remove('hidden');
  ensureMapImgEl().classList.remove('hidden');
  ensureArrowEl().classList.remove('hidden');
  attachHeadingListener();
  updateNavigation(mode);
  if (pollTimer) clearInterval(pollTimer);
  // Re-check the route every 30s while navigation is on screen.
  pollTimer = setInterval(() => updateNavigation(mode), 30000);
}

export function hideNavigationScreen() {
  ensureNavEl().classList.add('hidden');
  ensureMapImgEl().classList.add('hidden');
  ensureArrowEl().classList.add('hidden');
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
