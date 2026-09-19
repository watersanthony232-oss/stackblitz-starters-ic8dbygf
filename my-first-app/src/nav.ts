// G2 Companion - Navigation Module
// Google Maps-based driving/motorbike/walking navigation with congestion
// and speed-camera alerts.
//
// REQUIRES: a Google Maps API key with Directions API + Roads API enabled.
// Paste it into GOOGLE_MAPS_API_KEY below. Without it, fetchDirections()
// will fail - this is expected until the key is added.

const GOOGLE_MAPS_API_KEY = 'AIzaSyD-C-e-GREUwp66CY2jpClsKv2Rg-DoUQs';

export type TravelMode = 'driving' | 'motorbike' | 'walking';

// Google's Directions API doesn't have a distinct "motorbike" mode -
// motorbike routing uses 'driving' with two-wheeler-style road handling
// left as a TODO refinement; walking maps directly.
function toGoogleTravelMode(mode: TravelMode): string {
  if (mode === 'walking') return 'walking';
  return 'driving';
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  isMotorway: boolean;
}

export interface RouteInfo {
  steps: RouteStep[];
  durationSeconds: number;
  durationInTrafficSeconds: number | null;
  distanceMeters: number;
  overviewPolyline: string | null;
}

const HOME_ADDRESS_KEY = 'g2companion_home_address';

export function getHomeAddress(): string | null {
  try {
    return localStorage.getItem(HOME_ADDRESS_KEY);
  } catch {
    return null;
  }
}

export function setHomeAddress(address: string) {
  try {
    localStorage.setItem(HOME_ADDRESS_KEY, address);
  } catch (e) {
    console.error('failed to save home address', e);
  }
}

export async function fetchDirections(
  originLat: number,
  originLon: number,
  destination: string,
  mode: TravelMode
): Promise<RouteInfo | null> {
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${originLat},${originLon}` +
    `&destination=${encodeURIComponent(destination)}` +
    `&mode=${toGoogleTravelMode(mode)}` +
    `&departure_time=now` +
    `&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') {
      console.error('directions request failed', data.status, data.error_message);
      return null;
    }
    const leg = data.routes[0].legs[0];
    const steps: RouteStep[] = leg.steps.map((s: any) => ({
      instruction: (s.html_instructions || '').replace(/<[^>]+>/g, ''),
      distanceMeters: s.distance?.value ?? 0,
      // crude motorway detection - Google doesn't flag this directly,
      // so we look for common UK motorway wording in the instruction text.
      isMotorway: /\bM\d+\b/.test(s.html_instructions || ''),
    }));
    return {
      steps,
      durationSeconds: leg.duration?.value ?? 0,
      durationInTrafficSeconds: leg.duration_in_traffic?.value ?? null,
      distanceMeters: leg.distance?.value ?? 0,
      overviewPolyline: data.routes[0].overview_polyline?.points ?? null,
    };
  } catch (e) {
    console.error('directions fetch failed', e);
    return null;
  }
}

// --- Congestion detection ---
// Normal roads: alert if congestion detected within 1 mile ahead.
// Motorways: alert at the slip road just before the congestion, but only
// if that slip road is within 5 miles - otherwise stay quiet.
const MILE_IN_METERS = 1609.34;
const NORMAL_ROAD_ALERT_RADIUS_M = 1 * MILE_IN_METERS;
const MOTORWAY_SLIP_ROAD_MAX_DISTANCE_M = 5 * MILE_IN_METERS;

export interface CongestionAlert {
  level: 'standstill' | 'mild';
  distanceMeters: number;
  onMotorway: boolean;
  diversionAvailable: boolean;
}

// Placeholder congestion check: compares duration_in_traffic against
// duration to estimate how bad traffic is right now. A real
// implementation needs per-segment traffic data (Google's Directions API
// only gives a whole-leg duration_in_traffic, not per-step) - likely
// requires the Roads API or repeated polling to localize where the delay
// actually is. Flagged as a TODO refinement once we can test against
// real traffic conditions.
export function checkForCongestion(route: RouteInfo): CongestionAlert | null {
  if (route.durationInTrafficSeconds == null) return null;
  const delayRatio = route.durationInTrafficSeconds / Math.max(route.durationSeconds, 1);
  if (delayRatio < 1.15) return null; // not congested enough to matter

  const level: CongestionAlert['level'] = delayRatio > 1.5 ? 'standstill' : 'mild';

  // Distance-to-alert logic: find the first upcoming motorway step vs
  // normal step to decide which distance rule applies. This is a
  // simplification until per-step congestion data is available.
  let distanceToNextMotorway = 0;
  let onMotorway = false;
  for (const step of route.steps) {
    if (step.isMotorway) {
      onMotorway = true;
      break;
    }
    distanceToNextMotorway += step.distanceMeters;
  }

  if (onMotorway) {
    if (distanceToNextMotorway > MOTORWAY_SLIP_ROAD_MAX_DISTANCE_M) {
      // Too far out to alert yet.
      return null;
    }
  } else if (distanceToNextMotorway > NORMAL_ROAD_ALERT_RADIUS_M) {
    return null;
  }

  return {
    level,
    distanceMeters: distanceToNextMotorway,
    onMotorway,
    diversionAvailable: true, // TODO: only true once we actually compute an alternate route
  };
}

// --- Speed cameras ---
// Google Maps' consumer Directions API does not expose speed camera
// locations directly (that data lives inside the Google Maps app/SDK
// itself, not the public Directions/Roads API). Getting real speed
// camera alerts likely needs a different data source (e.g. a
// speed-camera database API) - flagged here rather than faked.
export function getSpeedCameraWarning(): string | null {
  // TODO: integrate a real speed camera data source once decided.
  return null;
}
