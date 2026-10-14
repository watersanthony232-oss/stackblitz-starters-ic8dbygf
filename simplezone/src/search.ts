// Finding shops: what they sell, where they are, and filters.

import { AREAS, miles, type Area } from './areas';
import { opensLate, opensSunday, openState } from './hours';
import type { Shop } from './shops';

export type Filters = { openNow?: boolean; openLate?: boolean; openSunday?: boolean; student?: boolean };
export type Place = { lat: number; lon: number };
export type Result = { shop: Shop; matched: string[]; distance?: number };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9£ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Plural to singular, near enough: "chargers" -> "charger", "cakes" -> "cake". */
const stem = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

/** Pulls an area name out of the search, so "deli Stockport" searches "deli" near Stockport. */
export function splitArea(query: string): { what: string; area?: Area } {
  const q = norm(query);
  const byLength = [...AREAS].sort((a, b) => b.name.length - a.name.length);
  for (const area of byLength) {
    const n = norm(area.name);
    const re = new RegExp(`(^| )(in |near )?${n.replace(/ /g, ' ')}( |$)`);
    if (re.test(q)) return { what: q.replace(re, ' ').trim(), area };
  }
  return { what: q };
}

/** The things a shop sells that match the search, or null if the shop doesn't match. */
export function matchShop(shop: Shop, what: string): string[] | null {
  const words = norm(what).split(' ').filter(Boolean).map(stem);
  if (!words.length) return [];
  const hasAll = (text: string) => {
    const tw = norm(text).split(' ').map(stem);
    return words.every((w) => tw.some((t) => t.startsWith(w)));
  };
  const matched = shop.sells.filter(hasAll);
  if (matched.length) return matched;
  if (hasAll(shop.name) || hasAll(shop.category) || hasAll(shop.sells.join(' '))) return [];
  return null;
}

export function passes(shop: Shop, f: Filters, now = new Date()): boolean {
  if (f.openNow && !openState(shop.hours, now).open) return false;
  if (f.openLate && !opensLate(shop.hours, now)) return false;
  if (f.openSunday && !opensSunday(shop.hours)) return false;
  if (f.student && !shop.studentDiscount) return false;
  return true;
}

/**
 * Search shops. With a place (your location or an area), nearest come first;
 * in an area, Plus shops get a place near the top of that area's list.
 */
export function search(
  shops: Shop[],
  opts: { what: string; area?: Area; near?: Place; filters?: Filters; now?: Date },
): Result[] {
  const { what, area, near, filters = {}, now = new Date() } = opts;
  const from = near ?? area;
  const out: Result[] = [];
  for (const shop of shops) {
    if (area && !near && shop.area !== area.name && miles(area, shop) > 3) continue;
    if (!passes(shop, filters, now)) continue;
    const matched = matchShop(shop, what);
    if (!matched) continue;
    out.push({ shop, matched, distance: from ? miles(from, shop) : undefined });
  }
  out.sort((a, b) => {
    if (area && !near && !!a.shop.plus !== !!b.shop.plus) return a.shop.plus ? -1 : 1;
    if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
    if (!!a.shop.plus !== !!b.shop.plus) return a.shop.plus ? -1 : 1;
    if (!!a.shop.example !== !!b.shop.example) return a.shop.example ? 1 : -1;
    return a.shop.name.localeCompare(b.shop.name);
  });
  return out;
}

export type Stop = { shop: Shop; items: string[]; distance?: number };

/**
 * Shopping list: find everything in the fewest stops. Each step picks the shop
 * that has the most items still to find (the nearer one if two tie).
 */
export function planStops(shops: Shop[], items: string[], near?: Place): { stops: Stop[]; missing: string[] } {
  let left = items.map((i) => i.trim()).filter(Boolean);
  const stops: Stop[] = [];
  const has = (shop: Shop, item: string) => matchShop(shop, item) !== null;
  while (left.length) {
    let best: Stop | undefined;
    for (const shop of shops) {
      if (stops.some((s) => s.shop === shop)) continue;
      const got = left.filter((i) => has(shop, i));
      if (!got.length) continue;
      const distance = near ? miles(near, shop) : undefined;
      const better =
        !best ||
        got.length > best.items.length ||
        (got.length === best.items.length && (distance ?? 0) < (best.distance ?? 0));
      if (better) best = { shop, items: got, distance };
    }
    if (!best) break;
    stops.push(best);
    left = left.filter((i) => !best!.items.includes(i));
  }
  return { stops, missing: left };
}
