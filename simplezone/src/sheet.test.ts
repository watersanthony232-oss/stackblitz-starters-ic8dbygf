import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatSpans, openLabel, parseHours } from './hours';
import { cleanWebsite, loadSheet, parseCsv, rowsToShops } from './sheet';

// The real "Simplezone live" headings, including the space after "Phone".
const HEADER = 'Name,Area,Category,What they sell,Opening hours,Whatsapp,Phone ,Website,Plus';

describe('reading the sheet', () => {
  it('reads the live sheet row', () => {
    const csv = `${HEADER}\r\nAurora Glance,Southampton,Apps & websites,,,07367 414672,,auroraglance.com,No\r\n`;
    const { shops, skipped } = rowsToShops(parseCsv(csv));
    expect(skipped).toBe(0);
    expect(shops).toHaveLength(1);
    const s = shops[0];
    expect(s.name).toBe('Aurora Glance');
    expect(s.area).toBe('Southampton');
    expect(s.lat).toBeCloseTo(50.904);
    expect(s.whatsapp).toBe('07367 414672');
    expect(s.phone).toBeUndefined();
    expect(s.website).toBe('https://auroraglance.com/');
    expect(s.plus).toBe(false);
    expect(s.hours).toBeUndefined();
    expect(s.sells).toEqual([]);
  });

  it('handles quotes, commas and line breaks in cells', () => {
    const rows = parseCsv('a,"b, c","say ""hi""\nthere"\n1,2,3');
    expect(rows).toEqual([['a', 'b, c', 'say "hi"\nthere'], ['1', '2', '3']]);
  });

  it('never keeps email addresses or email columns', () => {
    const csv = `Name,Email,Area,What they sell\nCafe,owner@cafe.co.uk,Shirley,"coffee, email me at owner@cafe.co.uk"`;
    const { shops } = rowsToShops(parseCsv(csv));
    expect(JSON.stringify(shops)).not.toContain('@');
    expect(shops[0].sells).toEqual(['coffee', 'email me at']);
  });

  it('skips bad rows without crashing', () => {
    const csv = `${HEADER}\n,Shirley,Cafe\n\nGood Cafe,Nowhere-ville,Cafe,"tea, cake",gibberish hours,123,,javascript:alert(1),Yes\nshort row`;
    const { shops, skipped } = rowsToShops(parseCsv(csv));
    expect(skipped).toBe(1);
    expect(shops.map((s) => s.name)).toEqual(['Good Cafe', 'short row']);
    const good = shops[0];
    expect(good.lat).toBeUndefined(); // unknown area: no made-up distance
    expect(good.hours).toBeUndefined(); // unreadable hours: no made-up "open now"
    expect(good.hoursText).toBe('gibberish hours');
    expect(good.whatsapp).toBeUndefined(); // too short to be a number
    expect(good.website).toBeUndefined();
    expect(good.plus).toBe(true);
  });

  it('copes with a sheet that has no Name column', () => {
    expect(rowsToShops(parseCsv('foo,bar\n1,2')).shops).toEqual([]);
    expect(rowsToShops([]).shops).toEqual([]);
  });

  it('only allows web links', () => {
    expect(cleanWebsite('www.example.co.uk')).toBe('https://www.example.co.uk/');
    expect(cleanWebsite('ftp://x.com')).toBeUndefined();
    expect(cleanWebsite('not a site')).toBeUndefined();
  });
});

describe('opening hours typed in the sheet', () => {
  it('reads common ways of writing hours', () => {
    const w = parseHours('Mon-Fri 9am-5:30pm, Sat 10-4, Sun closed')!;
    expect(formatSpans(w[1])).toBe('9am – 5:30pm');
    expect(formatSpans(w[5])).toBe('9am – 5:30pm');
    expect(formatSpans(w[6])).toBe('10am – 4pm');
    expect(formatSpans(w[0])).toBe('Closed');
  });

  it('reads 24-hour times, "to", late nights and two sessions', () => {
    expect(formatSpans(parseHours('Monday to Saturday 08:00 - 20:00')![3])).toBe('8am – 8pm');
    expect(formatSpans(parseHours('Fri & Sat 6pm-2am')![5])).toBe('6pm – 2am');
    expect(formatSpans(parseHours('Daily 12-2, 5-10')![2])).toBe('12pm – 2pm, 5pm – 10pm');
    expect(formatSpans(parseHours('Weekdays 5pm-11')![1])).toBe('5pm – 11pm');
  });

  it('gives up rather than guess', () => {
    expect(parseHours('')).toBeUndefined();
    expect(parseHours('By appointment')).toBeUndefined();
    expect(parseHours('Mon-Fri 9-5, bank holidays vary')).toBeUndefined();
    expect(parseHours('Mon 25-26')).toBeUndefined();
  });

  it('works out open now from typed hours', () => {
    const w = parseHours('Mon-Sat 9am-5pm')!;
    // Wednesday 14 Oct 2026, 10am UK time (9am UTC).
    expect(openLabel(w, new Date('2026-10-14T09:00:00Z'))).toBe('Open now · closes 5pm');
    // Saturday 6pm: next opening is Monday.
    expect(openLabel(w, new Date('2026-10-17T17:00:00Z'))).toBe('Closed · opens Monday 9am');
  });
});

describe('loading the sheet', () => {
  afterEach(() => vi.unstubAllGlobals());
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it('saves a good copy and uses it when there is no internet', async () => {
    vi.stubGlobal('localStorage', store());
    vi.stubGlobal('fetch', async () => new Response(`${HEADER}\nAurora Glance,Southampton`));
    const live = await loadSheet('https://example.com/sheet.csv');
    expect(live.source).toBe('live');
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Network request failed');
    });
    const off = await loadSheet('https://example.com/sheet.csv');
    expect(off.source).toBe('saved');
    expect(off.error).toBe('offline');
    expect(off.shops[0].name).toBe('Aurora Glance');
  });

  it('shows nothing (not a crash) when offline with no saved copy', async () => {
    vi.stubGlobal('localStorage', store());
    vi.stubGlobal('fetch', async () => new Response('<html>Sign in</html>'));
    const r = await loadSheet('https://example.com/sheet.csv');
    expect(r).toMatchObject({ source: 'none', shops: [], error: 'offline' });
  });

  it('waits for the published link', async () => {
    vi.stubGlobal('localStorage', store());
    expect((await loadSheet('')).error).toBe('not-set-up');
  });
});
