import { describe, expect, it } from 'vitest';
import { findArea } from './areas';
import { formatTime, openLabel, openState, week } from './hours';
import { matchShop, planStops, search, splitArea } from './search';
import type { Shop } from './business';
import { parseCsv, rowsToShops } from './sheet';

// 14 Oct 2026 is a Wednesday; October is British Summer Time (UTC+1).
const at = (iso: string) => new Date(iso);

describe('hours', () => {
  const pub = week({ 'mon-thu': '12-23', 'fri-sat': '12-24', sun: '12-22:30' });

  it('formats times like the website', () => {
    expect(formatTime(0)).toBe('12am');
    expect(formatTime(1440)).toBe('12am');
    expect(formatTime(720)).toBe('12pm');
    expect(formatTime(22 * 60 + 30)).toBe('10:30pm');
  });

  it('knows open now in UK time', () => {
    // 13:00 UTC = 14:00 in the UK.
    expect(openLabel(pub, at('2026-10-14T13:00:00Z'))).toBe('Open now · closes 11pm');
    expect(openLabel(pub, at('2026-10-16T13:00:00Z'))).toBe('Open now · closes 12am');
  });

  it('says when it opens next', () => {
    expect(openLabel(pub, at('2026-10-14T08:00:00Z'))).toBe('Closed · opens 12pm');
    const weekdays = week({ 'mon-fri': '9-17' });
    // Saturday 10am UK.
    expect(openLabel(weekdays, at('2026-10-17T09:00:00Z'))).toBe('Closed · opens Monday 9am');
    expect(openState(week({}), at('2026-10-17T09:00:00Z'))).toEqual({ open: false });
  });

  it('handles winter time', () => {
    // 2 Dec 2026, 13:00 UTC = 13:00 UK (GMT).
    const lunch = week({ 'mon-sun': '12-13' });
    expect(openState(lunch, at('2026-12-02T12:30:00Z')).open).toBe(true);
    expect(openState(lunch, at('2026-12-02T13:30:00Z')).open).toBe(false);
  });
});

describe('search', () => {
  const now = at('2026-10-14T13:00:00Z');
  // Made-up businesses for these tests only, in the same layout as the "Simplezone live" sheet.
  const CSV = `Name,Area,Category,What they sell,Opening hours,Whatsapp,Phone ,Website,Plus
Test Pub,Freemantle,Pub,"cider, thatchers cider, real ale",Mon-Thu 12-23; Fri-Sat 12-24; Sun 12-10:30pm,,,,No
Test Cafe,Portswood,Café,"coffee, tea, cakes, breakfast",Daily 8-17,,,,No
Test Phone Repairs,Shirley,Phone repairs,"phone charger, screen repair, cases",Mon-Sat 9-17; Sun 10-16,,,,No
Test Massage,Harefield,Wellbeing,"massage, sports massage",Mon-Fri 8-20,,,,Yes
Test Barber,Nowhere,Hair,haircut,By appointment,,,,No`;
  const BUSINESSES = rowsToShops(parseCsv(CSV)).shops;
  const byName = (name: string) => BUSINESSES.find((s) => s.name === name)!;

  it('splits the area out of the search', () => {
    expect(splitArea('deli Stockport')).toEqual({ what: 'deli', area: findArea('Stockport') });
    expect(splitArea('haircut in Shirley').area?.name).toBe('Shirley');
    expect(splitArea('coffee').area).toBeUndefined();
  });

  it('matches what businesses sell, plurals too', () => {
    const phone = byName('Test Phone Repairs');
    expect(matchShop(phone, 'phone chargers')).toEqual(['phone charger']);
    expect(matchShop(phone, 'bread')).toBeNull();
  });

  it('finds every cider business, nearest first', () => {
    const r = search(BUSINESSES, { what: 'cider', near: findArea('Shirley')!, now });
    expect(r.map((x) => x.shop.name)).toEqual(['Test Pub']);
    expect(r[0].matched).toContain('thatchers cider');
    expect(r[0].distance).toBeGreaterThan(0);
  });

  it('puts unknown places after known ones when sorting by distance', () => {
    const r = search(BUSINESSES, { what: '', near: findArea('Shirley')!, now });
    expect(r[0].shop.name).toBe('Test Phone Repairs');
    expect(r[r.length - 1].shop.name).toBe('Test Barber');
    expect(r[r.length - 1].distance).toBeUndefined();
  });

  it('puts Plus businesses near the top of an area', () => {
    const extra: Shop = { ...byName('Test Massage'), id: 'x', name: 'A Massage Place', plus: false };
    const r = search([extra, ...BUSINESSES], { what: 'massage', area: findArea('Harefield'), now });
    expect(r[0].shop.name).toBe('Test Massage');
  });

  it('filters by open Sunday, and never guesses unknown hours', () => {
    const r = search(BUSINESSES, { what: '', filters: { openSunday: true }, now });
    expect(r.map((x) => x.shop.name).sort()).toEqual(['Test Cafe', 'Test Phone Repairs', 'Test Pub']);
    const open = search(BUSINESSES, { what: '', filters: { openNow: true }, now });
    expect(open.map((x) => x.shop.name)).not.toContain('Test Barber');
  });

  it('plans a shopping list in the fewest stops', () => {
    const { stops, missing } = planStops(BUSINESSES, ['coffee', 'cakes', 'phone charger', 'unicorn']);
    expect(stops.map((s) => s.shop.name)).toEqual(['Test Cafe', 'Test Phone Repairs']);
    expect(missing).toEqual(['unicorn']);
  });
});
