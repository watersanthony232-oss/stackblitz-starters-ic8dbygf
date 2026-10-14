import { describe, expect, it } from 'vitest';
import { findArea } from './areas';
import { formatTime, openLabel, openState, week } from './hours';
import { matchShop, planStops, search, splitArea } from './search';
import { SHOPS, type Shop } from './shops';

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

  it('splits the area out of the search', () => {
    expect(splitArea('deli Stockport')).toEqual({ what: 'deli', area: findArea('Stockport') });
    expect(splitArea('haircut in Shirley').area?.name).toBe('Shirley');
    expect(splitArea('coffee').area).toBeUndefined();
  });

  it('matches what shops sell, plurals too', () => {
    const phone = SHOPS.find((s) => s.id === 'example-phone-shop')!;
    expect(matchShop(phone, 'phone chargers')).toEqual(['phone charger']);
    expect(matchShop(phone, 'bread')).toBeNull();
  });

  it('finds every cider shop, nearest first', () => {
    const shirley = findArea('Shirley')!;
    const r = search(SHOPS, { what: 'cider', near: shirley, now });
    expect(r.map((x) => x.shop.id)).toEqual(['example-pub']);
    expect(r[0].matched).toContain('thatchers cider');
    expect(r[0].distance).toBeGreaterThan(0);
  });

  it('puts Plus shops near the top of an area', () => {
    const extra: Shop = { ...SHOPS[1], id: 'x', name: 'A Massage Place', plus: false, area: 'Harefield', lat: 50.92, lon: -1.346, sells: ['massage'] };
    const r = search([extra, ...SHOPS], { what: 'massage', area: findArea('Harefield'), now });
    expect(r[0].shop.id).toBe('holistic-directions');
  });

  it('filters by student discount and open Sunday', () => {
    const r = search(SHOPS, { what: '', filters: { student: true, openSunday: true }, now });
    expect(r.map((x) => x.shop.id).sort()).toEqual(['example-cafe', 'example-phone-shop']);
  });

  it('plans a shopping list in the fewest stops', () => {
    const { stops, missing } = planStops(SHOPS, ['coffee', 'cakes', 'phone charger', 'unicorn']);
    expect(stops.map((s) => s.shop.id)).toEqual(['example-cafe', 'example-phone-shop']);
    expect(missing).toEqual(['unicorn']);
  });
});
