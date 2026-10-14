import { describe, expect, it } from 'vitest';
import { parseCsv, rowsToShops, SHEET_CSV_URL } from './sheet';

// Downloads the real published "Simplezone live" sheet and reads it exactly as the app does.
// Runs only when LIVE_SHEET=1 (the GitHub check), because it needs the internet.
const live = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.LIVE_SHEET === '1';

describe.runIf(live)('the live Simplezone sheet', () => {
  it('downloads as CSV and every row reads cleanly', async () => {
    const res = await fetch(SHEET_CSV_URL);
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv.trimStart().startsWith('<')).toBe(false); // not a sign-in or error page
    const rows = parseCsv(csv);
    expect(rows[0].map((h) => h.trim().toLowerCase())).toContain('name');
    const { shops, skipped } = rowsToShops(rows);
    console.log(`Live sheet: ${shops.length} businesses, ${skipped} skipped rows`);
    for (const s of shops) console.log(`- ${s.name} | ${s.area} | ${s.category} | hours ${s.hours ? 'read' : s.hoursText ? 'shown as typed' : 'none'}`);
    expect(JSON.stringify(shops)).not.toContain('@'); // never an email address
    expect(skipped).toBe(0);
  });
});
