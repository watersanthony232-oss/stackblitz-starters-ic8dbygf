// Makes A4 window posters (PDF + PNG preview). Usage: node make.mjs <outDir> "<name>|<category>|<area>" ...
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { chromium } from 'playwright-core';

const URL_TEXT = 'simplezone.auroraglance.com';
const URL = `https://${URL_TEXT}`;
const out = process.argv[2];
const items = process.argv.slice(3).map((s) => {
  const [name, category, area] = s.split('|');
  return { name, category, area };
});

const mark = `<svg viewBox="228 203 1040 610" role="img" aria-label="Simple Zone logo"><defs><path id="s" d="M486 213 L893 213 L780 345 L486 345 A50 50 0 0 0 486 445 L690 445 A179 179 0 0 1 690 803 L238 803 L370 673 L690 673 A49 49 0 0 0 690 575 L486 575 A181 181 0 0 1 486 213 Z"/><mask id="g" maskUnits="userSpaceOnUse" x="228" y="203" width="1040" height="610"><rect x="228" y="203" width="1040" height="610" fill="#fff"/><use href="#s" fill="#000" stroke="#000" stroke-width="22" stroke-linejoin="round"/></mask></defs><path fill="#0A2551" mask="url(#g)" d="M893 213 L1258 213 L1040 673 L1258 673 L1148 803 L765 803 L880 673 L1035 345 L780 345 Z"/><use href="#s" fill="#04A4A2"/></svg>`;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const qr = await QRCode.toString(URL, { type: 'svg', errorCorrectionLevel: 'H', margin: 0, color: { dark: '#11244E', light: '#FFFFFF' } });

function page({ name, category, area }) {
  const sub = [category, area].filter(Boolean).map(esc).join(' · ');
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 0 }
* { box-sizing: border-box; margin: 0 }
html, body { width: 210mm; height: 297mm; font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #11244E; background: #fff }
.p { height: 297mm; display: flex; flex-direction: column; align-items: center; text-align: center }
.top { width: 100%; background: #11244E; color: #fff; padding: 14mm 12mm 12mm; display: flex; flex-direction: column; align-items: center }
.tile { background: #fff; border-radius: 6mm; padding: 7mm 10mm; }
.tile img { width: 58mm; height: 34mm; display: block }
.find { font-size: 15pt; letter-spacing: .08em; text-transform: uppercase; color: #9FD8D6; margin-top: 7mm }
.sz { font-size: 40pt; font-weight: 800; margin-top: 1mm }
.mid { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 16mm }
.name { font-size: ${name.length > 22 ? 30 : 38}pt; font-weight: 800; line-height: 1.1 }
.sub { font-size: 16pt; color: #377D7B; font-weight: 600; margin-top: 3mm }
.qr { width: 78mm; height: 78mm; margin-top: 9mm; padding: 4mm; border: 1.2mm solid #377D7B; border-radius: 5mm }
.qr svg { width: 100%; height: 100% }
.scan { font-size: 17pt; font-weight: 700; margin-top: 5mm }
.url { font-size: 14pt; color: #377D7B; margin-top: 1.5mm }
.what { font-size: 13pt; color: #293436; margin-top: 6mm; line-height: 1.5 }
.bot { width: 100%; background: #377D7B; color: #fff; padding: 7mm 10mm; font-size: 17pt; font-weight: 700 }
</style></head><body><div class="p">
<div class="top"><div class="tile"><img src="${logo}" alt="Simple Zone logo"></div><div class="find">Find us on</div><div class="sz">Simple Zone</div></div>
<div class="mid">
${name ? `<div class="name">${esc(name)}</div>` : ''}${sub ? `<div class="sub">${sub}</div>` : ''}
<div class="qr">${qr}</div>
<div class="scan">Scan to find local businesses near you</div>
<div class="url">${URL_TEXT}</div>
<div class="what">Opening hours · open now · nearest first · directions</div>
</div>
<div class="bot">Local first – less driving, more living.</div>
</div></body></html>`;
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
// The logo goes in as a plain picture (some PDF viewers draw the SVG cut-out wrongly).
const lp = await browser.newPage({ viewport: { width: 1040, height: 610 }, deviceScaleFactor: 2 });
await lp.setContent(`<style>*{margin:0}body{background:#fff}svg{display:block;width:1040px;height:610px}</style>${mark}`);
const logo = `data:image/png;base64,${(await lp.screenshot({ omitBackground: false })).toString('base64')}`;
await lp.close();
const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1 });
fs.mkdirSync(out, { recursive: true });
for (const it of items) {
  const file = (it.name || 'blank').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pg = await ctx.newPage();
  await pg.setContent(page(it));
  await pg.pdf({ path: path.join(out, `Simple-Zone-window-poster-${file}.pdf`), format: 'A4', printBackground: true });
  await pg.screenshot({ path: path.join(out, `Simple-Zone-window-poster-${file}.png`), fullPage: true });
  await pg.close();
}
await browser.close();
console.log('done', items.length);
