// Areas shoppers can pick, with a rough centre point for "nearest" when location is off.

export type Area = { name: string; lat: number; lon: number; region: string };

export const AREAS: Area[] = [
  { name: 'Southampton City Centre', lat: 50.904, lon: -1.404, region: 'Hampshire' },
  { name: 'Bassett', lat: 50.94, lon: -1.4, region: 'Hampshire' },
  { name: 'Bitterne', lat: 50.918, lon: -1.36, region: 'Hampshire' },
  { name: 'Freemantle', lat: 50.912, lon: -1.425, region: 'Hampshire' },
  { name: 'Harefield', lat: 50.92, lon: -1.346, region: 'Hampshire' },
  { name: 'Lordshill', lat: 50.945, lon: -1.45, region: 'Hampshire' },
  { name: 'Millbrook', lat: 50.92, lon: -1.447, region: 'Hampshire' },
  { name: 'Ocean Village', lat: 50.896, lon: -1.393, region: 'Hampshire' },
  { name: 'Portswood', lat: 50.925, lon: -1.393, region: 'Hampshire' },
  { name: 'Shirley', lat: 50.923, lon: -1.433, region: 'Hampshire' },
  { name: 'Sholing', lat: 50.903, lon: -1.361, region: 'Hampshire' },
  { name: 'Swaythling', lat: 50.937, lon: -1.382, region: 'Hampshire' },
  { name: 'Thornhill', lat: 50.913, lon: -1.341, region: 'Hampshire' },
  { name: 'Woolston', lat: 50.896, lon: -1.378, region: 'Hampshire' },
  { name: "Chandler's Ford", lat: 50.985, lon: -1.38, region: 'Hampshire' },
  { name: 'Eastleigh', lat: 50.969, lon: -1.35, region: 'Hampshire' },
  { name: 'Hedge End', lat: 50.913, lon: -1.3, region: 'Hampshire' },
  { name: 'Romsey', lat: 50.989, lon: -1.497, region: 'Hampshire' },
  { name: 'Totton', lat: 50.918, lon: -1.49, region: 'Hampshire' },
  { name: 'West End', lat: 50.927, lon: -1.335, region: 'Hampshire' },
  { name: 'Winchester', lat: 51.063, lon: -1.308, region: 'Hampshire' },
  { name: 'Fareham', lat: 50.852, lon: -1.179, region: 'Hampshire' },
  { name: 'Gosport', lat: 50.795, lon: -1.126, region: 'Hampshire' },
  { name: 'Portsmouth', lat: 50.8, lon: -1.09, region: 'Hampshire' },
  { name: 'Southsea', lat: 50.785, lon: -1.09, region: 'Hampshire' },
  { name: 'Havant', lat: 50.856, lon: -0.984, region: 'Hampshire' },
  { name: 'Waterlooville', lat: 50.88, lon: -1.03, region: 'Hampshire' },
  { name: 'Andover', lat: 51.208, lon: -1.48, region: 'Hampshire' },
  { name: 'Basingstoke', lat: 51.266, lon: -1.087, region: 'Hampshire' },
  { name: 'Stockport', lat: 53.41, lon: -2.158, region: 'Greater Manchester' },
];

/** Other names businesses use for an area in the sheet. */
const ALIASES: Record<string, string> = {
  southampton: 'Southampton City Centre',
  'city centre': 'Southampton City Centre',
  'chandlers ford': "Chandler's Ford",
};

export function findArea(name: string): Area | undefined {
  const n = name.trim().toLowerCase().replace(/\s+/g, ' ');
  const target = (ALIASES[n] ?? n).toLowerCase();
  return AREAS.find((a) => a.name.toLowerCase() === target);
}

/** True if the business's area (as typed in the sheet) is this area. */
export function sameArea(typed: string, area: Area): boolean {
  return findArea(typed) === area;
}

/** Straight-line distance in miles. */
export function miles(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

export function formatMiles(m: number): string {
  if (m < 0.1) return 'under 0.1 miles';
  return m < 10 ? `${m.toFixed(1)} miles` : `${Math.round(m)} miles`;
}
