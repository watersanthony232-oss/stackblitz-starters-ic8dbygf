// G2 Companion - Points of Interest
// Nearest petrol station / supermarket / pub-wine bar search, using the
// Google Places Nearby Search API.
//
// REQUIRES: the same GOOGLE_MAPS_API_KEY from nav.ts, but with the
// Places API also enabled on that key - not yet confirmed enabled.

const GOOGLE_MAPS_API_KEY = 'AIzaSyD-C-e-GREUwp66CY2jpClsKv2Rg-DoUQs';

export type PoiCategory = 'petrol' | 'supermarket' | 'pub';

const CATEGORY_TO_PLACE_TYPE: Record<PoiCategory, string> = {
  petrol: 'gas_station',
  supermarket: 'supermarket',
  pub: 'bar',
};

export interface PoiResult {
  name: string;
  distanceMeters: number;
  address: string;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findNearby(
  category: PoiCategory,
  lat: number,
  lon: number
): Promise<PoiResult[]> {
  const type = CATEGORY_TO_PLACE_TYPE[category];
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lon}` +
    `&rankby=distance` +
    `&type=${type}` +
    `&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') {
      console.error('places request failed', data.status, data.error_message);
      return [];
    }
    return data.results.slice(0, 3).map((r: any) => ({
      name: r.name,
      address: r.vicinity ?? '',
      distanceMeters: haversineMeters(
        lat,
        lon,
        r.geometry.location.lat,
        r.geometry.location.lng
      ),
    }));
  } catch (e) {
    console.error('places fetch failed', e);
    return [];
  }
}
