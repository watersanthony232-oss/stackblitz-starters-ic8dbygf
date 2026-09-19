// G2 Companion - Speed Limit Lookup
// Uses the free OpenStreetMap Overpass API to find the posted speed
// limit for the nearest tagged road, since Google's Roads API only
// gives real speed-limit data to enterprise accounts (confirmed
// earlier - not available on a standard key). This is the free
// workaround; coverage depends on how well that road is tagged in
// OpenStreetMap, which is generally good for UK main roads but can be
// patchy on minor residential streets.

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function fetchSpeedLimitMph(lat: number, lon: number): Promise<number | null> {
  const query = `[out:json];way(around:25,${lat},${lon})[highway][maxspeed];out tags;`;
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const elements = data.elements ?? [];
    for (const el of elements) {
      const raw: string = el.tags?.maxspeed ?? '';
      const match = raw.match(/(\d+)\s*mph/i);
      if (match) return parseInt(match[1], 10);
      // Some UK ways are tagged just "30" etc. (implicitly mph in the UK).
      const numeric = raw.match(/^(\d+)$/);
      if (numeric) return parseInt(numeric[1], 10);
    }
    return null;
  } catch (e) {
    console.error('speed limit lookup failed', e);
    return null;
  }
}
