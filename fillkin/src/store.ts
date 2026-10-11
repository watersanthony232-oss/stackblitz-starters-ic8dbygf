// Fillkin - local persistence: favourites, community-style price reports
// (kept on this device), and user settings.

import type { StationKind, FuelType } from './stations';
import type { Units } from './geo';

export interface PriceReport {
  price: number;
  fuel: FuelType | 'kwh';
  reportedAt: number;
}

export interface Settings {
  kind: StationKind;
  units: Units;
  radius: number;
  fuel: FuelType | 'any';
  currency: string;
}

const KEYS = {
  favourites: 'fillkin.favourites',
  prices: 'fillkin.prices',
  settings: 'fillkin.settings',
};

export const DEFAULT_SETTINGS: Settings = {
  kind: 'fuel',
  units: 'mi',
  radius: 5,
  fuel: 'any',
  currency: '£',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode etc.) - keep working in memory only.
  }
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) };
}

export function saveSettings(s: Settings) {
  write(KEYS.settings, s);
}

let favourites = new Set(read<string[]>(KEYS.favourites, []));

export function isFavourite(id: string) {
  return favourites.has(id);
}

export function toggleFavourite(id: string): boolean {
  if (favourites.has(id)) favourites.delete(id);
  else favourites.add(id);
  write(KEYS.favourites, [...favourites]);
  return favourites.has(id);
}

let prices = read<Record<string, PriceReport[]>>(KEYS.prices, {});

const PRICE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function latestPrice(id: string, fuel: PriceReport['fuel']): PriceReport | null {
  const list = prices[id]?.filter((p) => p.fuel === fuel && Date.now() - p.reportedAt < PRICE_MAX_AGE_MS);
  if (!list || list.length === 0) return null;
  return list.reduce((a, b) => (b.reportedAt > a.reportedAt ? b : a));
}

export function reportPrice(id: string, fuel: PriceReport['fuel'], price: number) {
  const list = (prices[id] ?? []).filter((p) => Date.now() - p.reportedAt < PRICE_MAX_AGE_MS);
  list.push({ price, fuel, reportedAt: Date.now() });
  prices = { ...prices, [id]: list.slice(-20) };
  write(KEYS.prices, prices);
}

export function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
