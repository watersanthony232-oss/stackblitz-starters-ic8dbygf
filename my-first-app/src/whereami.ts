// G2 Companion - "Where am I" Module
// Reverse-geocodes the current GPS position into a real road name,
// shown minimalistically at bottom-left while driving. Also the fix
// for navigation showing "unnamed road" - that was because only
// turn-by-turn step text was shown, never the actual current road.

const GOOGLE_MAPS_API_KEY = 'AIzaSyD-C-e-GREUwp66CY2jpClsKv2Rg-DoUQs';

let pollTimer: ReturnType<typeof setInterval> | null = null;

function ensureEl(): HTMLDivElement {
  let el = document.getElementById('whereami') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'whereami';
    el.className = 'whereami hidden';
    document.body.appendChild(el);
  }
  return el;
}

function extractRoadName(geocodeResults: any[]): string | null {
  for (const result of geocodeResults) {
    const routeComponent = result.address_components?.find((c: any) =>
      c.types.includes('route')
    );
    if (routeComponent) return routeComponent.long_name;
  }
  return null;
}

async function updateRoadName() {
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?latlng=${pos.coords.latitude},${pos.coords.longitude}` +
        `&key=${GOOGLE_MAPS_API_KEY}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.status !== 'OK') {
          ensureEl().textContent = '';
          return;
        }
        const roadName = extractRoadName(data.results);
        ensureEl().textContent = roadName ?? '';
      } catch (e) {
        console.error('reverse geocode failed', e);
      }
    },
    () => {
      /* silently skip - no GPS fix yet */
    },
    { enableHighAccuracy: true }
  );
}

export function showWhereAmI() {
  ensureEl().classList.remove('hidden');
  updateRoadName();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(updateRoadName, 15000);
}

export function hideWhereAmI() {
  ensureEl().classList.add('hidden');
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
