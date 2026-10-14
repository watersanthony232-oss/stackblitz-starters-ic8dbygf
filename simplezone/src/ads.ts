// Zonie Ads: one offer per Plus business, from the sheet's "Ad text", "Ad photo link" and "Ad ends" columns.
// Shown only when ZONIE_ADS_ENABLED is true. No tracking: every shopper sees the same offers.

import type { Shop } from './business';

/** Today's date in the UK, as YYYY-MM-DD. */
export function ukToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Plus businesses with an offer that hasn't ended yet (it shows up to and including its end date). */
export function activeAds(shops: Shop[], now = new Date()): Shop[] {
  const today = ukToday(now);
  return shops.filter((s) => s.plus && s.ad && s.ad.ends >= today);
}
