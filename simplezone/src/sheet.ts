// Business data from the published "Simplezone live" Google Sheet (File › Share › Publish to web › CSV).
// Only public details are read. Email columns are ignored and email addresses are never shown.

import { findArea } from './areas';
import { parseHours } from './hours';
import type { Shop } from './shops';

/**
 * The sheet's "Publish to web" CSV link (starts https://docs.google.com/spreadsheets/d/e/2PACX-…).
 * Empty until the published link is confirmed: the app then shows "No businesses yet".
 */
export const SHEET_CSV_URL = '';

const CACHE_KEY = 'sz.sheet';
const TIMEOUT_MS = 15_000;

/** Reads CSV text into rows of cells. Handles quotes, commas and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi;

/** Trims a cell and removes anything that looks like an email address. */
function clean(v: string | undefined): string {
  return (v ?? '').replace(EMAIL, '').replace(/\s+/g, ' ').trim();
}

/** Keeps only digits, spaces and a leading +; needs at least 10 digits to be a UK number. */
function cleanPhone(v: string): string | undefined {
  const t = v.replace(/[^0-9+ ]/g, '').trim();
  return t.replace(/\D/g, '').length >= 10 ? t : undefined;
}

/** "auroraglance.com" -> "https://auroraglance.com". Only web links are allowed. */
export function cleanWebsite(v: string): string | undefined {
  if (!v || /\s/.test(v)) return undefined;
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(url);
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || !u.hostname.includes('.')) return undefined;
    return u.href;
  } catch {
    return undefined;
  }
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Column headings in the sheet (matched loosely, so "Phone " and "WhatsApp" both work). */
const COLUMNS = {
  name: 'name',
  area: 'area',
  category: 'category',
  sells: 'what they sell',
  hours: 'opening hours',
  whatsapp: 'whatsapp',
  phone: 'phone',
  website: 'website',
  plus: 'plus',
} as const;

/**
 * Turns the sheet into businesses. A bad row is skipped, never a crash.
 * Returns the businesses and how many rows were skipped.
 */
export function rowsToShops(rows: string[][]): { shops: Shop[]; skipped: number } {
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const col = (key: keyof typeof COLUMNS) => {
    const i = header.indexOf(COLUMNS[key]);
    return i >= 0 && !header[i].includes('mail') ? i : -1;
  };
  const idx = Object.fromEntries(Object.keys(COLUMNS).map((k) => [k, col(k as keyof typeof COLUMNS)])) as Record<
    keyof typeof COLUMNS,
    number
  >;
  const shops: Shop[] = [];
  const ids = new Set<string>();
  let skipped = 0;
  if (idx.name < 0) return { shops, skipped: Math.max(rows.length - 1, 0) };

  for (const r of rows.slice(1)) {
    try {
      const get = (k: keyof typeof COLUMNS) => (idx[k] >= 0 ? clean(r[idx[k]]) : '');
      const name = get('name');
      if (!name) {
        if (r.some((c) => c.trim())) skipped++;
        continue;
      }
      const areaText = get('area');
      const place = areaText ? findArea(areaText) : undefined;
      const hoursText = get('hours');
      let id = slug(`${name} ${areaText}`) || 'business';
      while (ids.has(id)) id += '-2';
      ids.add(id);
      shops.push({
        id,
        name,
        category: get('category'),
        area: areaText,
        lat: place?.lat,
        lon: place?.lon,
        sells: get('sells')
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
        hours: parseHours(hoursText),
        hoursText: hoursText || undefined,
        phone: cleanPhone(get('phone')),
        whatsapp: cleanPhone(get('whatsapp')),
        website: cleanWebsite(get('website')),
        plus: /^(yes|y|true|plus)$/i.test(get('plus')),
      });
    } catch {
      skipped++;
    }
  }
  return { shops, skipped };
}

export type SheetResult = {
  shops: Shop[];
  skipped: number;
  /** 'live' = just downloaded, 'saved' = last good copy on this phone, 'none' = nothing to show. */
  source: 'live' | 'saved' | 'none';
  savedAt?: number;
  error?: 'offline' | 'not-set-up';
};

type Saved = { at: number; csv: string };

function loadSaved(): Saved | undefined {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return v && typeof v.csv === 'string' && typeof v.at === 'number' ? v : undefined;
  } catch {
    return undefined;
  }
}

function fromSaved(error: SheetResult['error']): SheetResult {
  const saved = loadSaved();
  if (!saved) return { shops: [], skipped: 0, source: 'none', error };
  return { ...rowsToShops(parseCsv(saved.csv)), source: 'saved', savedAt: saved.at, error };
}

/** Downloads the sheet. With no internet it falls back to the last good copy on this phone. */
export async function loadSheet(url = SHEET_CSV_URL): Promise<SheetResult> {
  if (!url) return fromSaved('not-set-up');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // In the iPhone app the phone fetches the sheet itself (see AppFiles in WebScreen.swift).
    const inApp = typeof location !== 'undefined' && location.protocol === 'simplezone:';
    const from = inApp ? `/live-sheet.csv?u=${encodeURIComponent(url)}` : url;
    const res = await fetch(from, { signal: ctrl.signal, cache: 'no-store', credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    if (/^\s*</.test(csv)) throw new Error('Not CSV'); // a sign-in or error page, not the sheet
    const result = rowsToShops(parseCsv(csv));
    if (!result.shops.length) {
      // An empty download shouldn't wipe a good saved copy.
      const saved = fromSaved(undefined);
      if (saved.shops.length) return saved;
    } else {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), csv } satisfies Saved));
      } catch {
        /* storage full or private mode: still show the live list */
      }
    }
    return { ...result, source: 'live' };
  } catch {
    return fromSaved('offline');
  } finally {
    clearTimeout(timer);
  }
}
