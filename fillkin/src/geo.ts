// Fillkin - geo helpers: distance, units, and place-name lookup.

export interface LatLon {
  lat: number;
  lon: number;
}

export type Units = 'mi' | 'km';

export function haversineMeters(a: LatLon, b: LatLon): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(meters: number, units: Units): string {
  if (units === 'mi') {
    const mi = meters / 1609.344;
    return mi < 0.1 ? `${Math.round(meters * 3.28084)} ft` : `${mi.toFixed(1)} mi`;
  }
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function radiusToMeters(radius: number, units: Units): number {
  return units === 'mi' ? radius * 1609.344 : radius * 1000;
}

export function currentPosition(): Promise<LatLon> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Could not get your location.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

export interface Place extends LatLon {
  label: string;
}

// Free-text place search via OpenStreetMap Nominatim.
export async function geocode(query: string): Promise<Place | null> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' +
    encodeURIComponent(query);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    label: data[0].display_name.split(',').slice(0, 2).join(','),
  };
}

export function directionsUrl(to: LatLon): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lon}`;
}
