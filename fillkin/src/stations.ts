// Fillkin - fuel station and EV charger search using OpenStreetMap data
// from the Overpass API (no API key required).

import { haversineMeters, type LatLon } from './geo';

export type StationKind = 'fuel' | 'ev';

export type FuelType = 'petrol' | 'diesel' | 'lpg' | 'e85';

export interface Connector {
  name: string;
  count: number | null;
}

export interface Station extends LatLon {
  id: string;
  kind: StationKind;
  name: string;
  brand: string | null;
  address: string | null;
  openingHours: string | null;
  fuels: FuelType[];
  connectors: Connector[];
  maxPowerKw: number | null;
  capacity: number | null;
  distanceMeters: number;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const FUEL_TAGS: Record<FuelType, string[]> = {
  petrol: ['fuel:octane_95', 'fuel:octane_98', 'fuel:octane_91', 'fuel:e10', 'fuel:e5', 'fuel:octane_100'],
  diesel: ['fuel:diesel', 'fuel:HGV_diesel'],
  lpg: ['fuel:lpg'],
  e85: ['fuel:e85'],
};

const SOCKET_NAMES: Record<string, string> = {
  type2: 'Type 2',
  type2_combo: 'CCS',
  type1_combo: 'CCS1',
  chademo: 'CHAdeMO',
  type1: 'Type 1',
  tesla_supercharger: 'Tesla',
  nacs: 'NACS',
  type2_cable: 'Type 2 (tethered)',
  schuko: 'Schuko',
  bs1363: '3-pin',
};

export function buildQuery(kind: StationKind, center: LatLon, radiusMeters: number): string {
  const amenity = kind === 'fuel' ? 'fuel' : 'charging_station';
  const r = Math.round(radiusMeters);
  return (
    `[out:json][timeout:25];` +
    `nwr["amenity"="${amenity}"](around:${r},${center.lat},${center.lon});` +
    `out center tags 200;`
  );
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function parsePowerKw(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/([\d.]+)\s*(kw|w)?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!isFinite(n)) return null;
  const unit = (m[2] ?? 'kw').toLowerCase();
  // Bare numbers above 1000 are almost always watts.
  if (unit === 'w' || (!m[2] && n > 1000)) return n / 1000;
  return n;
}

function buildAddress(t: Record<string, string>): string | null {
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  const parts = [street, t['addr:city'] ?? t['addr:town'] ?? t['addr:village'], t['addr:postcode']].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function parseElement(el: OverpassElement, kind: StationKind, origin: LatLon): Station | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  const t = el.tags ?? {};

  const fuels = (Object.keys(FUEL_TAGS) as FuelType[]).filter((f) =>
    FUEL_TAGS[f].some((tag) => t[tag] === 'yes')
  );

  const connectors: Connector[] = [];
  let maxPowerKw: number | null = null;
  for (const [key, value] of Object.entries(t)) {
    const m = key.match(/^socket:([a-z0-9_]+)(?::(output))?$/);
    if (!m) continue;
    const socket = m[1];
    if (m[2] === 'output') {
      const kw = parsePowerKw(value);
      if (kw != null) maxPowerKw = Math.max(maxPowerKw ?? 0, kw);
      continue;
    }
    if (value === 'no' || value === '0') continue;
    const count = /^\d+$/.test(value) ? parseInt(value, 10) : null;
    connectors.push({ name: SOCKET_NAMES[socket] ?? socket.replace(/_/g, ' '), count });
  }
  const output = parsePowerKw(t['charging_station:output'] ?? t['maxpower']);
  if (output != null) maxPowerKw = Math.max(maxPowerKw ?? 0, output);

  const brand = t.brand ?? t.operator ?? t.network ?? null;
  const name = t.name ?? brand ?? (kind === 'fuel' ? 'Fuel station' : 'EV charger');
  const capacity = t.capacity && /^\d+$/.test(t.capacity) ? parseInt(t.capacity, 10) : null;

  return {
    id: `${el.type}/${el.id}`,
    kind,
    lat,
    lon,
    name,
    brand: brand && brand !== name ? brand : null,
    address: buildAddress(t),
    openingHours: t.opening_hours ?? null,
    fuels,
    connectors,
    maxPowerKw,
    capacity,
    distanceMeters: haversineMeters(origin, { lat, lon }),
  };
}

export async function findStations(
  kind: StationKind,
  center: LatLon,
  radiusMeters: number,
  signal?: AbortSignal
): Promise<Station[]> {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(buildQuery(kind, center, radiusMeters)),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
  });
  if (res.status === 429 || res.status === 504) {
    throw new Error('The map data server is busy. Please try again in a moment.');
  }
  if (!res.ok) throw new Error(`Station search failed (${res.status})`);
  const data = (await res.json()) as { elements: OverpassElement[] };
  return data.elements
    .map((el) => parseElement(el, kind, center))
    .filter((s): s is Station => s !== null)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
