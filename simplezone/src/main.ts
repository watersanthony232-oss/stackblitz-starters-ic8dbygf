import './style.css';

import { AREAS, findArea, formatMiles, type Area } from './areas';
import {
  EMAIL,
  JOIN_URL,
  PRIVACY_URL,
  TAGLINE,
  WHATSAPP,
  WHATSAPP_SHOWN,
  ZONIE_ADS_ENABLED,
  ZONIE_CARD_SIZE,
  ZONIE_STAMPS_LIVE,
} from './config';
import { DAY_NAMES, formatSpans, openLabel, openState, ukNow } from './hours';
import { planStops, search, splitArea, type Filters, type Place } from './search';
import { loadSheet, type SheetResult } from './sheet';
import type { Shop } from './business';
import { runTour, TOUR_CSV } from './tour';
import { activeAds } from './ads';

// Laid out like the Simple Zone website on Android (simplezone.auroraglance.com, 14 Oct 2026).

const QUICK = ['coffee', 'cider', 'massage', 'nails', 'haircut', 'phone charger', 'bread', 'takeaway'];
const SIZES = [
  { z: 1, label: 'Normal text' },
  { z: 1.2, label: 'Bigger text' },
  { z: 1.4, label: 'Biggest text' },
];

/** The SZ mark (also the app icon). Each copy needs its own ids. */
const mark = (id: string, cls = 'logo-spin') =>
  `<svg class="${cls}" viewBox="228 203 1040 610" role="img" aria-label="Simple Zone logo"><defs><path id="szs-${id}" d="M486 213 L893 213 L780 345 L486 345 A50 50 0 0 0 486 445 L690 445 A179 179 0 0 1 690 803 L238 803 L370 673 L690 673 A49 49 0 0 0 690 575 L486 575 A181 181 0 0 1 486 213 Z"/><mask id="szgap-${id}" maskUnits="userSpaceOnUse" x="228" y="203" width="1040" height="610"><rect x="228" y="203" width="1040" height="610" fill="#fff"/><use href="#szs-${id}" fill="#000" stroke="#000" stroke-width="22" stroke-linejoin="round"/></mask></defs><path fill="#0A2551" mask="url(#szgap-${id})" d="M893 213 L1258 213 L1040 673 L1258 673 L1148 803 L765 803 L880 673 L1035 345 L780 345 Z"/><use href="#szs-${id}" fill="#04A4A2"/></svg>`;
const TICK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;

// ---------- State ----------

type View = { name: 'home' } | { name: 'business'; id: string } | { name: 'join' } | { name: 'about' } | { name: 'zonie' };

const state = {
  view: { name: 'home' } as View,
  data: undefined as SheetResult | undefined,
  loading: true,
  query: '',
  areaName: load('sz.area') ?? '',
  category: '',
  near: undefined as Place | undefined,
  locating: false,
  locError: '',
  filters: {} as Filters,
  size: Math.min(Number(load('sz.size') ?? 0) || 0, SIZES.length - 1),
  list: load('sz.list') ?? '',
  showList: false,
  scrollHome: 0,
};

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: fine, just not remembered */
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const app = document.getElementById('app')!;
const shops = (): Shop[] => state.data?.shops ?? [];
const area = (): Area | undefined => (state.areaName ? findArea(state.areaName) : undefined);

// ---------- Text size: follows iPhone Settings › Display › Text Size, plus the Aa button ----------

function applyTextSize() {
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;font-size:17px';
  probe.style.font = '-apple-system-body'; // ignored outside Apple browsers, leaving 17px
  document.body.appendChild(probe);
  const base = parseFloat(getComputedStyle(probe).fontSize) || 17;
  probe.remove();
  document.documentElement.style.fontSize = `${base * SIZES[state.size].z}px`;
}

// ---------- Navigation ----------

function go(view: View) {
  if (state.view.name === 'home') state.scrollHome = window.scrollY;
  state.view = view;
  state.showList = false;
  render();
  window.scrollTo(0, view.name === 'home' ? state.scrollHome : 0);
  // Move VoiceOver to the new screen's heading.
  document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
}

// ---------- Rendering ----------

function render() {
  const v = state.view;
  const body =
    v.name === 'business'
      ? businessPage(v.id)
      : v.name === 'join'
        ? joinPage()
        : v.name === 'about'
          ? aboutPage()
          : v.name === 'zonie' && ZONIE_STAMPS_LIVE
            ? zoniePage()
            : homePage();
  app.innerHTML = `
    <header class="top">
      <button class="brand" data-go="home" aria-label="Simple Zone, home"><span class="mark" aria-hidden="true">${mark('top', 'hdr-mark')}</span><b>Simple Zone</b></button>
      <nav class="toplinks" aria-label="Menu"><button data-go="about">About</button><button data-go="join">Add your business</button></nav>
    </header>
    <main>${body}<p class="foot">Simple Zone · by Aurora Glance</p></main>
    ${state.showList ? listSheet() : ''}`;
}

/** Status of the business list: loading, or no internet with a saved copy. */
function dataBanner(): string {
  const d = state.data;
  if (state.loading && !d) return `<p class="note" role="status">Loading businesses…</p>`;
  if (d?.source === 'saved' && d.savedAt && d.error === 'offline') {
    const when = new Date(d.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    return `<p class="note" role="status">No internet right now. Showing the list saved on ${esc(when)}.</p>`;
  }
  return '';
}

function emptyData(): string {
  const d = state.data;
  if (!d || d.shops.length) return '';
  if (d.error === 'offline')
    return `<div class="box" role="status"><b>Can't reach Simple Zone.</b><br>Check your internet connection and try again.<div class="actions"><button class="btn-line" data-act="reload">Try again</button></div></div>`;
  return `<div class="box" role="status"><b>No businesses yet.</b><br>Local businesses are joining now. Check back soon.</div>`;
}

function homePage(): string {
  const all = shops();
  const split = splitArea(state.query);
  const a = area() ?? split.area;
  const pool = state.category ? all.filter((s) => s.category === state.category) : all;
  const results = search(pool, { what: split.what, area: a, near: state.near, filters: state.filters });
  const categories = [...new Set(all.map((s) => s.category).filter(Boolean))].sort((x, y) => x.localeCompare(y));
  const where = state.near ? 'near you' : a ? `in ${a.name}` : 'in all areas';
  const count = split.what
    ? `${plural(results.length, 'business sells', 'businesses sell')} “${esc(split.what)}”${state.near || a ? ', nearest first' : ''}`
    : `${plural(results.length, 'business', 'businesses')} ${where}`;
  const f = state.filters;
  return `
    <h1 class="sr-only" tabindex="-1">Simple Zone</h1>
    <p class="tagline">${esc(TAGLINE)}</p>
    <form class="searchbox" data-act="search" role="search">
      <input name="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="What do you need?" value="${esc(state.query)}" aria-label="What do you need?">
      <button class="btn-teal" type="submit">Search</button>
    </form>
    <button class="btn-teal wide" data-act="near" aria-pressed="${!!state.near}">${
      state.locating ? 'Finding you…' : state.near ? 'Nearest first ✓ (tap to turn off)' : '📍 Near me – nearest first'
    }</button>
    ${state.locError ? `<p class="msg err" role="alert">${esc(state.locError)}</p>` : ''}
    <button class="sizebtn" data-act="size" aria-label="Text size: ${SIZES[state.size].label}. Tap to change.">Aa ${SIZES[state.size].label}</button>
    <div class="chips" role="group" aria-label="Quick searches"><span class="label">Tap to find the nearest:</span>
      ${QUICK.map((q) => `<button class="chip" data-quick="${esc(q)}">${esc(q)}</button>`).join('')}
    </div>
    <button class="listbtn" data-act="list">🛒 My shopping list – find it all in the fewest stops</button>
    ${ZONIE_STAMPS_LIVE ? `<button class="listbtn" data-go="zonie">Zonie loyalty cards – one card for every business</button>` : ''}
    <div class="chips" role="group" aria-label="Area and filters">
      <select class="chip" data-act="area" aria-label="Area">
        <option value="">All areas</option>
        ${AREAS.map((x) => `<option ${x.name === state.areaName ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select>
      ${
        categories.length
          ? `<select class="chip" data-act="category" aria-label="Category">
        <option value="">All categories</option>
        ${categories.map((c) => `<option ${c === state.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}
      </select>`
          : ''
      }
      ${filterChip('openNow', 'Open now', f.openNow)}
      ${filterChip('openLate', 'Open late', f.openLate)}
      ${filterChip('openSunday', 'Open Sunday', f.openSunday)}
    </div>
    ${dataBanner()}
    ${offersStrip(all)}
    ${
      all.length
        ? `<p class="count" role="status">${count}</p>
    ${results.map((r, i) => businessCard(r.shop, i, r.matched, r.distance)).join('') || noResults()}`
        : emptyData()
    }
    <section class="cta">
      <h2>Own a business?</h2>
      <p>Put your business on Simple Zone for free. Customers can find what you sell, see when you're open and get in touch.</p>
      <button class="btn-teal" data-go="join">Add your business</button>
    </section>`;
}

/** Zonie Ads: "Today's offers" from Plus businesses (only when ZONIE_ADS_ENABLED). */
function offersStrip(all: Shop[]): string {
  if (!ZONIE_ADS_ENABLED) return '';
  const ads = activeAds(all);
  if (!ads.length) return '';
  return `
    <h2>Today's offers</h2>
    <div class="offers" role="list">
      ${ads
        .map(
          (s) => `<button class="offer" role="listitem" data-business="${esc(s.id)}">
        ${s.ad!.photo ? `<img src="${esc(s.ad!.photo)}" alt="" loading="lazy">` : ''}
        <span class="offer-from">Offer from ${esc(s.name)}</span>
        <span class="offer-text">${esc(s.ad!.text)}</span>
      </button>`,
        )
        .join('')}
    </div>`;
}

function filterChip(key: keyof Filters, label: string, on?: boolean) {
  return `<button class="chip ${on ? 'on' : ''}" data-filter="${key}" aria-pressed="${!!on}">${label}</button>`;
}

function noResults(): string {
  return `<div class="box"><b>No businesses found yet.</b><br>Try another word, pick “All areas”, or turn off a filter.</div>`;
}

function openLine(shop: Shop): string {
  if (!shop.hours) return shop.hoursText ? `<span class="meta">${esc(shop.hoursText)}</span>` : '';
  const open = openState(shop.hours).open;
  return `<span class="open ${open ? '' : 'closed'}">${esc(openLabel(shop.hours))}</span>`;
}

function businessCard(shop: Shop, i: number, matched: string[], distance?: number): string {
  const meta = [shop.category, shop.area, distance !== undefined ? formatMiles(distance) : ''].filter(Boolean).join(' · ');
  const sells = matched.length
    ? `<span class="sells">Sells: ${matched.map((m) => `<mark>${esc(m)}</mark>`).join(', ')}</span>`
    : shop.sells.length
      ? `<span class="sells">${esc(shop.sells.slice(0, 5).join(', '))}${shop.sells.length > 5 ? '…' : ''}</span>`
      : '';
  return `
    <button class="shop" data-business="${esc(shop.id)}" style="--i:${Math.min(i, 10)}">
      <span class="name">${esc(shop.name)}</span>${shop.plus ? ' <span class="badge plus">PLUS</span>' : ''}
      ${meta ? `<span class="meta">${esc(meta)}</span>` : ''}
      ${openLine(shop)}
      ${sells}
    </button>`;
}

function phoneHref(n: string) {
  return 'tel:' + n.replace(/[^0-9+]/g, '');
}
function whatsappHref(n: string) {
  let d = n.replace(/[^0-9]/g, '');
  if (d.startsWith('0')) d = '44' + d.slice(1);
  return `https://wa.me/${d}`;
}

function businessPage(id: string): string {
  const shop = shops().find((s) => s.id === id);
  if (!shop)
    return `<button class="back" data-go="home">← All businesses</button><h1 tabindex="-1">Not found</h1><p>That business isn't on Simple Zone any more.</p>`;
  const today = ukNow().day;
  const order = [1, 2, 3, 4, 5, 6, 0];
  // The sheet has no street address, so Maps searches for the business by name and area.
  const mapsHref = `https://maps.apple.com/?q=${encodeURIComponent([shop.name, shop.area].filter(Boolean).join(', '))}`;
  const actions = [
    shop.area ? `<a class="btn-line" href="${mapsHref}" aria-label="Directions to ${esc(shop.name)} in Maps">Directions</a>` : '',
    shop.phone ? `<a class="btn-line" href="${phoneHref(shop.phone)}">Call</a>` : '',
    shop.whatsapp ? `<a class="btn-line" href="${whatsappHref(shop.whatsapp)}">WhatsApp</a>` : '',
    shop.website ? `<a class="btn-line" href="${esc(shop.website)}">Visit website</a>` : '',
  ].join('');
  return `
    <div class="shoppage">
      <button class="back" data-go="home">← All businesses</button>
      <h1 tabindex="-1">${esc(shop.name)}${shop.plus ? ' <span class="badge plus">PLUS</span>' : ''}</h1>
      <p class="meta">${esc([shop.category, shop.area].filter(Boolean).join(' · '))}</p>
      <p>${openLine(shop)}</p>
      ${ZONIE_ADS_ENABLED && activeAds([shop]).length ? `<div class="offerbox"><b>Offer:</b> ${esc(shop.ad!.text)}</div>` : ''}
      ${actions ? `<div class="actions">${actions}</div>` : ''}
      ${
        shop.sells.length
          ? `<h2>What they sell</h2>
      <div class="chips">${shop.sells.map((s) => `<button class="chip" data-quick="${esc(s)}">${esc(s)}</button>`).join('')}</div>`
          : ''
      }
      <h2>Opening times</h2>
      ${
        shop.hours
          ? `<table class="hours"><caption class="sr-only">Opening times</caption>${order
              .map(
                (d) =>
                  `<tr class="${d === today ? 'today' : ''}"><th scope="row">${DAY_NAMES[d]}${d === today ? '<span class="sr-only"> (today)</span>' : ''}</th><td>${esc(formatSpans(shop.hours![d]))}</td></tr>`,
              )
              .join('')}</table>`
          : `<p>${esc(shop.hoursText ?? 'Not listed yet – call or message to check.')}</p>`
      }
    </div>`;
}

function zoniePage(): string {
  // Only reachable when Zonie stamps are live (ZONIE_STAMPS_LIVE). Hidden until then, so the
  // App Store version has no "coming soon" feature.
  const stamps = 0;
  const circles = Array.from(
    { length: ZONIE_CARD_SIZE },
    (_, i) => `<span class="stamp ${i < stamps ? 'got' : ''}">${i < stamps ? TICK : ''}</span>`,
  ).join('');
  return `
    <button class="back" data-go="home">← All businesses</button>
    <h1 tabindex="-1">Your Zonie loyalty cards</h1>
    <p class="meta">One loyalty card for every business on Simple Zone.</p>
    <div class="zonie" role="img" aria-label="Your Zonie card: ${stamps} of ${ZONIE_CARD_SIZE} stamps">
      <div class="zonie-head"><span>Your card</span><small>${stamps} of ${ZONIE_CARD_SIZE}</small></div>
      <div class="stamps" aria-hidden="true">${circles}</div>
      <p>Collect ${ZONIE_CARD_SIZE} stamps for a reward.</p>
    </div>
    <div class="box">
      <b>Why people love Zonie</b>
      <ul>
        <li>Free for shoppers – always</li>
        <li>Works with every Simple Zone business</li>
        <li>No more wallet full of loyalty cards</li>
        <li>Each business picks its reward, e.g. 10th coffee free</li>
      </ul>
    </div>`;
}

function aboutPage(): string {
  return `
    <button class="back" data-go="home">← All businesses</button>
    <div class="about-head">
      ${mark('about')}
      <h1 tabindex="-1">About Simple Zone</h1>
      <p class="tagline">${esc(TAGLINE)}</p>
    </div>
    <p>Simple Zone is a free local app. Type what you need and it shows the nearest businesses that have it, whether they're open right now, and how to get in touch.</p>
    <p>We're starting in Southampton and across Hampshire.</p>
    <div class="box">
      <b>Your privacy</b><br>
      <b>We never sell your data.</b><br>
      No accounts, no adverts, no tracking. Your location is only used on this phone when you tap Near me. It is never stored or sent to us. Your shopping list and text size stay on this phone.
      <div class="actions"><a class="btn-line" href="${PRIVACY_URL}">Read the privacy policy</a></div>
    </div>
    <p>Simple Zone is made by Aurora Glance (part of Toz Industries), a small Southampton business making apps and websites.</p>
    <div class="actions">
      <a class="btn-line" href="https://wa.me/${WHATSAPP}" aria-label="WhatsApp us on ${WHATSAPP_SHOWN}">WhatsApp us</a>
      <a class="btn-line" href="mailto:${EMAIL}">Email us</a>
    </div>`;
}

function joinPage(): string {
  // No prices in the app: details and sign-up are on the Simple Zone website.
  return `
    <button class="back" data-go="home">← All businesses</button>
    <h1 tabindex="-1">Add your business</h1>
    <p>It's free to put your business on Simple Zone. People nearby can find what you sell, see when you're open and get in touch.</p>
    <div class="box">
      <b>Your free listing includes</b>
      <ul><li>Your own business page</li><li>Opening times</li><li>Call, WhatsApp and directions buttons</li></ul>
    </div>
    <div class="actions"><a class="btn-teal" href="${JOIN_URL}">Find out more and join</a></div>
    <p class="meta">Opens the Simple Zone website.</p>
    <div class="box">
      Prefer to talk? Anthony can set it all up for you.
      <div class="actions"><a class="btn-line" href="https://wa.me/${WHATSAPP}">WhatsApp ${WHATSAPP_SHOWN}</a><a class="btn-line" href="mailto:${EMAIL}">Email us</a></div>
    </div>`;
}

function listSheet(): string {
  const items = state.list.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  const plan = items.length ? planStops(shops(), items, state.near ?? area()) : undefined;
  return `
    <div class="sheet-bg" data-act="closelist">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="My shopping list">
        <h2>🛒 My shopping list</h2>
        <p class="meta">One thing per line. Simple Zone finds it all in the fewest stops.</p>
        <textarea data-act="listtext" aria-label="Shopping list, one thing per line" placeholder="bread&#10;phone charger&#10;coffee">${esc(state.list)}</textarea>
        ${
          plan
            ? `<h2>${plural(plan.stops.length, 'stop', 'stops')}</h2>
               ${plan.stops.map((s, i) => businessCard(s.shop, i, s.items, s.distance)).join('')}
               ${plan.missing.length ? `<p class="msg">Not found yet: ${esc(plan.missing.join(', '))}</p>` : ''}`
            : ''
        }
        <div class="row"><button class="btn-line" data-act="clearlist">Clear</button><button class="btn-teal" data-act="closelist-btn">Done</button></div>
      </div>
    </div>`;
}

// ---------- Actions ----------

async function refresh() {
  state.loading = true;
  render();
  state.data = await loadSheet();
  state.loading = false;
  render();
}

function runSearch(q: string) {
  state.query = q;
  if (state.view.name !== 'home') go({ name: 'home' });
  else render();
  document.querySelector('.count')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/** The iPhone app's bridge (WebScreen.swift). Missing in a normal browser. */
type AppWindow = Window & {
  webkit?: { messageHandlers?: { sz?: { postMessage: (m: unknown) => void } } };
  szLocated?: (lat: number, lon: number) => void;
  szLocateFailed?: (why: string) => void;
};

function locate() {
  if (state.near) {
    state.near = undefined;
    render();
    return;
  }
  // In the iPhone app, the phone finds the location (see WebScreen.swift) and calls back here.
  const bridge = (window as AppWindow).webkit?.messageHandlers?.sz;
  if (bridge) {
    state.locating = true;
    state.locError = '';
    render();
    const w = window as AppWindow;
    w.szLocated = (lat, lon) => {
      state.locating = false;
      state.near = { lat, lon };
      render();
    };
    w.szLocateFailed = (why) => {
      state.locating = false;
      state.locError =
        why === 'denied'
          ? 'Location is off for Simple Zone. Turn it on in Settings › Simple Zone › Location, or pick your area instead.'
          : 'Couldn’t find your location. Pick your area instead.';
      render();
    };
    bridge.postMessage({ type: 'locate' });
    return;
  }
  if (!navigator.geolocation) {
    state.locError = 'Location isn’t available on this phone. Pick your area instead.';
    render();
    return;
  }
  state.locating = true;
  state.locError = '';
  render();
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.locating = false;
      state.near = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      render();
    },
    () => {
      state.locating = false;
      state.locError = 'Couldn’t find your location. Check Settings › Simple Zone › Location, or pick your area instead.';
      render();
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
  );
}

app.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const el = t.closest<HTMLElement>('[data-go],[data-business],[data-quick],[data-filter],[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'closelist' && t !== el) return; // tap inside the sheet, not on the dim background
  if (el.dataset.go) return go({ name: el.dataset.go } as View);
  if (el.dataset.business) return go({ name: 'business', id: el.dataset.business });
  if (el.dataset.quick) {
    state.showList = false;
    return runSearch(el.dataset.quick);
  }
  if (el.dataset.filter) {
    const k = el.dataset.filter as keyof Filters;
    state.filters[k] = !state.filters[k];
    return render();
  }
  switch (act) {
    case 'size':
      state.size = (state.size + 1) % SIZES.length;
      save('sz.size', String(state.size));
      applyTextSize();
      render();
      return document.querySelector<HTMLElement>('.sizebtn')?.focus();
    case 'near':
      return locate();
    case 'reload':
      return void refresh();
    case 'list':
      state.showList = true;
      render();
      return document.querySelector<HTMLElement>('.sheet textarea')?.focus();
    case 'closelist':
    case 'closelist-btn':
      state.showList = false;
      return render();
    case 'clearlist':
      state.list = '';
      save('sz.list', '');
      return render();
  }
});

app.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = (e.target as HTMLFormElement).elements.namedItem('q') as HTMLInputElement;
  input.blur();
  runSearch(input.value);
});

app.addEventListener('change', (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.act === 'area') {
    state.areaName = (t as HTMLSelectElement).value;
    state.near = undefined;
    save('sz.area', state.areaName);
    render();
  }
  if (t.dataset.act === 'category') {
    state.category = (t as HTMLSelectElement).value;
    render();
  }
  if (t.dataset.act === 'listtext') {
    state.list = (t as HTMLTextAreaElement).value;
    save('sz.list', state.list);
    render();
    document.querySelector<HTMLTextAreaElement>('.sheet textarea')?.focus();
  }
});

// Back from Settings: pick up a new Text Size, and fresh business details.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  applyTextSize();
  if (!state.loading) void refresh();
});

// Refresh "open now" every minute.
setInterval(() => {
  if (!document.querySelector(':focus') && !state.showList) render();
}, 60_000);

// ---------- Start: the logo spins gently while the businesses load ----------

// Screenshot tour (GitHub check only): sample businesses instead of the live sheet.
if (import.meta.env.VITE_TOUR) save('sz.sheet', JSON.stringify({ at: Date.now(), csv: TOUR_CSV }));

applyTextSize();
const splash = document.createElement('div');
splash.className = 'splash';
splash.setAttribute('role', 'status');
splash.innerHTML = `${mark('splash')}<p class="tagline">${esc(TAGLINE)}</p>`;
document.body.appendChild(splash);
const shownAt = Date.now();
render();
void refresh().finally(() => {
  setTimeout(() => {
    splash.classList.add('gone');
    setTimeout(() => splash.remove(), 600);
    if (import.meta.env.VITE_TOUR) void startTour();
  }, Math.max(0, 1200 - (Date.now() - shownAt)));
});

async function startTour() {
  const first = () => shops().find((s) => s.hours) ?? shops()[0];
  await runTour([
    { name: 'home', run: () => go({ name: 'home' }) },
    { name: 'search', run: () => runSearch('coffee') },
    { name: 'business', run: () => first() && go({ name: 'business', id: first()!.id }) },
    { name: 'about', run: () => go({ name: 'about' }) },
    { name: 'join', run: () => go({ name: 'join' }) },
  ]);
}
