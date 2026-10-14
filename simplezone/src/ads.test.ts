import { describe, expect, it } from 'vitest';
import { activeAds, ukToday } from './ads';
import { parseAdEnds, parseCsv, rowsToShops } from './sheet';

const CSV = `Name,Area,Category,What they sell,Opening hours,Whatsapp,Phone ,Website,Plus,Ad text,Ad photo link,Ad ends
Plus Cafe,Shirley,Café,coffee,,,,,Yes,2 coffees for £5 this week,https://example.com/cafe.jpg,31/10/2026
Free Cafe,Shirley,Café,coffee,,,,,No,Free cake,,31/10/2026
Old Offer,Shirley,Café,coffee,,,,,Yes,Last week's deal,,10/10/2026
Bad Date,Shirley,Café,coffee,,,,,Yes,Deal,,next Friday
Bad Photo,Shirley,Café,coffee,,,,,Yes,Deal,javascript:alert(1),2026-10-31`;

describe('Zonie Ads', () => {
  const shops = rowsToShops(parseCsv(CSV)).shops;
  const at = new Date('2026-10-14T12:00:00Z');

  it('reads UK and ISO end dates, and rejects nonsense', () => {
    expect(parseAdEnds('31/10/2026')).toBe('2026-10-31');
    expect(parseAdEnds('1/11/26')).toBe('2026-11-01');
    expect(parseAdEnds('2026-10-31')).toBe('2026-10-31');
    expect(parseAdEnds('31/02/2026')).toBeUndefined();
    expect(parseAdEnds('next Friday')).toBeUndefined();
  });

  it('shows only current offers from Plus businesses', () => {
    expect(activeAds(shops, at).map((s) => s.name)).toEqual(['Plus Cafe', 'Bad Photo']);
    expect(shops.find((s) => s.name === 'Bad Date')!.ad).toBeUndefined();
  });

  it('keeps an https photo and drops anything else', () => {
    expect(shops[0].ad).toEqual({ text: '2 coffees for £5 this week', photo: 'https://example.com/cafe.jpg', ends: '2026-10-31' });
    expect(shops.find((s) => s.name === 'Bad Photo')!.ad!.photo).toBeUndefined();
  });

  it('shows an offer all day on its last day (UK time), then hides it', () => {
    // British Summer Time ends on 25 Oct 2026, so on 31 Oct UK time is the same as UTC.
    expect(ukToday(new Date('2026-10-31T23:30:00Z'))).toBe('2026-10-31');
    expect(activeAds(shops, new Date('2026-10-31T23:30:00Z')).map((s) => s.name)).toContain('Plus Cafe');
    expect(activeAds(shops, new Date('2026-11-01T00:30:00Z')).map((s) => s.name)).not.toContain('Plus Cafe');
  });
});
