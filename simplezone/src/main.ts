import './style.css';

import { AREAS, findArea, formatMiles, type Area } from './areas';
import {
  EMAIL,
  JOIN_URL,
  PRIVACY_URL,
  TAGLINE,
  WHATSAPP,
  WHATSAPP_SHOWN,
  ZONIE_CARD_SIZE,
  ZONIE_STAMPS_LIVE,
} from './config';
import { DAY_NAMES, formatSpans, formatTime, openLabel, openState, ukNow } from './hours';
import { planStops, search, splitArea, type Filters, type Place } from './search';
import { loadSheet, type SheetResult } from './sheet';
import type { Shop } from './shops';

const QUICK = ['coffee', 'haircut', 'massage', 'nails', 'phone charger', 'bread', 'takeaway', 'cider'];
const SIZES = [
  { z: 1, label: 'Normal text' },
  { z: 1.2, label: 'Bigger text' },
  { z: 1.4, label: 'Biggest text' },
];

// ---------- Icons (decorative: VoiceOver reads the button text instead) ----------

const svg = (d: string, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICON = {
  home: svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  card: svg('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  phone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  map: svg('<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  chat: svg('<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/>'),
  web: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>'),
};
/** The Simple Zone pin, as in the Android app. */
const PIN = `<svg class="pin" viewBox="0 0 22 28" aria-hidden="true"><path d="M11 1C5.5 1 1 5.4 1 10.8 1 18 11 27 11 27s10-9 10-16.2C21 5.4 16.5 1 11 1z" fill="var(--teal)"/><circle cx="11" cy="10.5" r="5.2" fill="#fff"/><circle cx="11" cy="10.5" r="2.6" fill="#D35F1A"/></svg>`;
/** The SZ mark (also the app icon). Each copy needs its own ids. */
const mark = (id: string) =>
  `<svg class="logo-spin" viewBox="228 203 1040 610" role="img" aria-label="Simple Zone logo"><defs><path id="szs-${id}" d="M486 213 L893 213 L780 345 L486 345 A50 50 0 0 0 486 445 L690 445 A179 179 0 0 1 690 803 L238 803 L370 673 L690 673 A49 49 0 0 0 690 575 L486 575 A181 181 0 0 1 486 213 Z"/><mask id="szgap-${id}" maskUnits="userSpaceOnUse" x="228" y="203" width="1040" height="610"><rect x="228" y="203" width="1040" height="610" fill="#fff"/><use href="#szs-${id}" fill="#000" stroke="#000" stroke-width="22" stroke-linejoin="round"/></mask></defs><path fill="#0A2551" mask="url(#szgap-${id})" d="M893 213 L1258 213 L1040 673 L1258 673 L1148 803 L765 803 L880 673 L1035 345 L780 345 Z"/><use href="#szs-${id}" fill="#04A4A2"/></svg>`;

// ---------- State ----------

type Tab = 'home' | 'search' | 'zonie' | 'about';
type View = { name: Tab } | { name: 'business'; id: string; from: Tab } | { name: 'join'; from: Tab };

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
  scroll: {} as Record<string, number>,
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
const tabOf = (v: View): Tab => ('from' in v ? v.from : v.name);

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
  state.scroll[viewKey(state.view)] = window.scrollY;
  state.view = view;
  state.showList = false;
  render();
  window.scrollTo(0, state.scroll[viewKey(view)] ?? 0);
  // Move VoiceOver to the new screen's heading.
  document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
}
const viewKey = (v: View) => ('id' in v ? `business:${v.id}` : v.name);

// ---------- Rendering ----------

function render() {
  const v = state.view;
  const body =
    v.name === 'business'
      ? businessPage(v.id)
      : v.name === 'join'
        ? joinPage()
        : v.name === 'search'
          ? searchPage()
          : v.name === 'zonie'
            ? zoniePage()
            : v.name === 'about'
              ? aboutPage()
              : homePage();
  const tab = tabOf(v);
  const tabBtn = (t: Tab, icon: string, label: string) =>
    `<button data-tab="${t}" ${tab === t ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`;
  app.innerHTML = `
    <header class="top">
      <button class="wordmark" data-tab="home" aria-label="Simple Zone, home">${PIN}<span><span class="simple">Simple</span><span class="zone">Zone</span></span></button>
      <button class="sizebtn" data-act="size" aria-label="Text size: ${SIZES[state.size].label}. Tap to change.">Aa</button>
    </header>
    <main>${body}<p class="foot">Simple Zone · by Aurora Glance</p></main>
    <nav class="tabs" aria-label="Main">
      ${tabBtn('home', ICON.home, 'Home')}
      ${tabBtn('search', ICON.search, 'Search')}
      ${tabBtn('zonie', ICON.card, 'Zonie')}
      ${tabBtn('about', ICON.info, 'About')}
    </nav>
    ${state.showList ? listSheet() : ''}`;
}

/** Status of the business list: loading, no internet, saved copy. */
function dataBanner(): string {
  const d = state.data;
  if (state.loading && !d) return `<p class="banner" role="status">Loading businesses…</p>`;
  if (!d) return '';
  if (d.source === 'saved' && d.savedAt && d.error === 'offline') {
    const when = new Date(d.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    return `<p class="banner" role="status">No internet right now. Showing the list saved on ${esc(when)}.</p>`;
  }
  return '';
}

function emptyData(): string {
  const d = state.data;
  if (!d || d.shops.length) return '';
  if (d.error === 'offline')
    return `<div class="box center" role="status"><h3>Can't reach Simple Zone</h3><p>Check your internet connection and try again.</p><p><button class="btn line" data-act="reload">Try again</button></p></div>`;
  return `<div class="box center" role="status"><h3>No businesses yet</h3><p>Local businesses are joining now. Check back soon.</p></div>`;
}

function homePage(): string {
  const all = shops();
  const a = area();
  const inCategory = state.category ? all.filter((s) => s.category === state.category) : all;
  const inArea = search(inCategory, { what: '', area: a, near: state.near });
  const areasWithBusinesses = AREAS.filter((x) => all.some((s) => findArea(s.area) === x));
  const categories = [...new Set(all.map((s) => s.category).filter(Boolean))].sort((x, y) => x.localeCompare(y));
  const where = state.near ? 'near you' : a ? `in ${a.name}` : '';
  return `
    <h1 class="sr-only" tabindex="-1">Simple Zone home</h1>
    <p class="tagline">${esc(TAGLINE)}</p>
    <form class="searchbox" data-act="search" role="search" style="margin-top:16px">
      ${ICON.search}
      <input name="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Try ‘coffee’ or ‘nails’" aria-label="Search businesses">
    </form>
    ${dataBanner()}
    <h2>Areas</h2>
    <div class="chips scroll" role="group" aria-label="Areas">
      <button class="chip near" data-act="near" aria-pressed="${!!state.near}">${state.locating ? 'Finding you…' : 'Near me'}</button>
      <button class="chip" data-area="" aria-pressed="${!state.areaName && !state.near}">All areas</button>
      ${areasWithBusinesses.map((x) => `<button class="chip" data-area="${esc(x.name)}" aria-pressed="${x.name === state.areaName && !state.near}">${esc(x.name)}</button>`).join('')}
      <select class="chip" data-act="area" aria-label="More areas">
        <option value="">More areas…</option>
        ${AREAS.map((x) => `<option ${x.name === state.areaName ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select>
    </div>
    ${state.locError ? `<p class="meta closed" role="alert">${esc(state.locError)}</p>` : ''}
    ${
      categories.length
        ? `<h2>Categories</h2>
    <div class="chips" role="group" aria-label="Categories">
      <button class="chip" data-cat="" aria-pressed="${!state.category}">All</button>
      ${categories.map((c) => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === state.category}">${esc(c)}</button>`).join('')}
    </div>`
        : ''
    }
    ${
      all.length
        ? `<h2>${esc(state.category || 'Businesses')} ${esc(where)}</h2>
    ${inArea.map((r, i) => businessCard(r.shop, i, [], r.distance)).join('') || `<div class="box">No businesses here yet. Try “All areas”.</div>`}`
        : emptyData()
    }
    <section class="cta">
      <h3>Own a business?</h3>
      <p>Put your business on Simple Zone for free. People nearby can find what you sell, see when you're open and get in touch.</p>
      <button class="btn primary" data-act="join">Add your business – free</button>
    </section>`;
}

function filterChip(key: keyof Filters, label: string) {
  return `<button class="chip" data-filter="${key}" aria-pressed="${!!state.filters[key]}">${label}</button>`;
}

function searchPage(): string {
  const split = splitArea(state.query);
  const effArea = area() ?? split.area;
  const results = state.query.trim()
    ? search(shops(), { what: split.what, area: effArea, near: state.near, filters: state.filters })
    : [];
  const count = !state.query.trim()
    ? ''
    : `<p class="meta" role="status">${plural(results.length, 'business', 'businesses')} for “${esc(split.what || state.query)}”${state.near ? ', nearest first' : effArea ? ` in ${esc(effArea.name)}` : ''}</p>`;
  return `
    <h1 tabindex="-1">Search</h1>
    <p class="label">What do you need?</p>
    <form class="searchbox" data-act="search" role="search">
      ${ICON.search}
      <input name="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="e.g. phone charger" value="${esc(state.query)}" aria-label="What do you need?">
    </form>
    ${dataBanner()}
    <div class="chips" role="group" aria-label="Quick searches">
      ${QUICK.map((q) => `<button class="chip" data-quick="${esc(q)}">${esc(q)}</button>`).join('')}
    </div>
    <div class="chips" role="group" aria-label="Filters">
      <button class="chip near" data-act="near" aria-pressed="${!!state.near}">${state.locating ? 'Finding you…' : 'Near me'}</button>
      ${filterChip('openNow', 'Open now')}
      ${filterChip('openLate', 'Open late')}
      ${filterChip('openSunday', 'Open Sunday')}
    </div>
    ${state.locError ? `<p class="meta closed" role="alert">${esc(state.locError)}</p>` : ''}
    <button class="btn line wide" data-act="list">My shopping list – find it all in the fewest stops</button>
    ${count}
    ${results.map((r, i) => businessCard(r.shop, i, r.matched, r.distance)).join('')}
    ${state.query.trim() && !results.length ? `<div class="box"><h3>Nothing found yet</h3><p>Try another word, pick “All areas”, or turn off a filter.</p></div>` : ''}
    ${!shops().length ? emptyData() : ''}`;
}

function statusText(shop: Shop): { text: string; cls: string } | undefined {
  if (!shop.hours) return undefined;
  const s = openState(shop.hours);
  if (s.open) return { text: 'Open', cls: 'open' };
  if (s.opens && s.opens.day === ukNow().day) return { text: `Opens ${formatTime(s.opens.min)}`, cls: 'closed' };
  return { text: 'Closed', cls: 'closed' };
}

function businessCard(shop: Shop, i: number, matched: string[], distance?: number): string {
  const meta = [shop.category, shop.area, distance !== undefined ? formatMiles(distance) : ''].filter(Boolean).join(' · ');
  const st = statusText(shop);
  const sells = matched.length ? `<span class="meta">Sells ${matched.map((m) => `<mark>${esc(m)}</mark>`).join(', ')}</span>` : '';
  return `
    <button class="card" data-business="${esc(shop.id)}" style="--i:${Math.min(i, 10)}">
      <span class="tile" aria-hidden="true">${esc(shop.name.charAt(0).toUpperCase())}</span>
      <span class="body"><span class="name">${esc(shop.name)}${shop.plus ? '<span class="badge">PLUS</span>' : ''}</span>
        ${meta ? `<span class="meta">${esc(meta)}</span>` : ''}${sells}</span>
      ${st ? `<span class="status ${st.cls}">${esc(st.text)}</span>` : ''}
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
    return `<button class="back" data-act="back" aria-label="Back">${ICON.back}</button><h1 tabindex="-1">Not found</h1><p>That business isn't on Simple Zone any more.</p>`;
  const today = ukNow().day;
  const order = [1, 2, 3, 4, 5, 6, 0];
  // The sheet has no street address, so Maps searches for the business by name and area.
  const mapsHref = `https://maps.apple.com/?q=${encodeURIComponent([shop.name, shop.area].filter(Boolean).join(', '))}`;
  const primary = shop.phone
    ? `<a class="btn primary" href="${phoneHref(shop.phone)}">${ICON.phone}Call</a>`
    : shop.whatsapp
      ? `<a class="btn primary" href="${whatsappHref(shop.whatsapp)}">${ICON.chat}WhatsApp</a>`
      : shop.website
        ? `<a class="btn primary" href="${esc(shop.website)}">${ICON.web}Website</a>`
        : '';
  const todayLine = shop.hours
    ? `${esc(openLabel(shop.hours))}<small>Today: ${esc(formatSpans(shop.hours[today]))}</small>`
    : esc(shop.hoursText ?? 'Opening times not listed yet');
  const links = [
    shop.phone && shop.whatsapp ? `<a class="btn line" href="${whatsappHref(shop.whatsapp)}">WhatsApp</a>` : '',
    shop.website && (shop.phone || shop.whatsapp) ? `<a class="btn line" href="${esc(shop.website)}">Visit website</a>` : '',
    shop.area ? `<a class="btn line" href="${mapsHref}" aria-label="Find ${esc(shop.name)} in Maps">Find in Maps</a>` : '',
  ].join('');
  return `
    <section class="hero">
      <button class="back" data-act="back" aria-label="Back">${ICON.back}</button>
      <h1 tabindex="-1">${esc(shop.name)}</h1>
      <p class="meta">${esc([shop.category, shop.area].filter(Boolean).join(' · '))}</p>
    </section>
    ${primary ? `<div class="actions">${primary}</div>` : ''}
    <p class="today">${ICON.clock}<span>${todayLine}</span></p>
    ${links ? `<div class="links">${links}</div>` : ''}
    ${
      shop.sells.length
        ? `<h2>What they sell</h2>
    <div class="chips">${shop.sells.map((s) => `<button class="chip" data-quick="${esc(s)}">${esc(s)}</button>`).join('')}</div>`
        : ''
    }
    ${
      shop.hours
        ? `<h2>Opening times</h2>
    <table class="hours"><caption class="sr-only">Opening times</caption>${order
      .map(
        (d) =>
          `<tr class="${d === today ? 'now' : ''}"><th scope="row">${DAY_NAMES[d]}${d === today ? '<span class="sr-only"> (today)</span>' : ''}</th><td>${esc(formatSpans(shop.hours![d]))}</td></tr>`,
      )
      .join('')}</table>`
        : ''
    }`;
}

function zoniePage(): string {
  const stamps = 0; // No stamps until Zonie stamping is live.
  const empty = Array.from(
    { length: ZONIE_CARD_SIZE },
    (_, i) => `<span class="stamp ${i < stamps ? 'got' : ''}">${i < stamps ? ICON.map : ''}</span>`,
  ).join('');
  return `
    <h1 tabindex="-1">Your Zonie cards</h1>
    <p class="meta">One loyalty card for every business on Simple Zone.</p>
    ${
      ZONIE_STAMPS_LIVE
        ? ''
        : `<div class="zonie" aria-label="Example Zonie card: ${stamps} of ${ZONIE_CARD_SIZE} stamps">
      <header><span>Your card</span><small>${stamps} of ${ZONIE_CARD_SIZE}</small></header>
      <div class="stamps" aria-hidden="true">${empty}</div>
      <p>Collect ${ZONIE_CARD_SIZE} stamps for a reward.</p>
    </div>
    <p class="center" style="text-align:center"><span class="soon">Coming soon</span></p>
    <p class="note">Zonie stamps aren't switched on yet. Your cards will appear here.</p>`
    }
    <div class="box">
      <h3>Why people love Zonie</h3>
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
    <div class="about-head">
      ${mark('about')}
      <h1 tabindex="-1">About Simple Zone</h1>
      <p class="tagline">${esc(TAGLINE)}</p>
    </div>
    <p>Simple Zone is a free local app. Type what you need and it shows the nearest businesses that have it, whether they're open now, and how to get in touch.</p>
    <p>We're starting in Southampton and across Hampshire.</p>
    <div class="box">
      <h3>Your privacy</h3>
      <p><b>We never sell your data.</b></p>
      <p>No accounts, no adverts, no tracking. Your location is only used on this phone when you tap Near me. It is never stored or sent to us. Your shopping list and text size stay on this phone.</p>
      <p><a href="${PRIVACY_URL}">Read the privacy policy</a></p>
    </div>
    <p>Simple Zone is made by Aurora Glance (part of Toz Industries), a small Southampton business making apps and websites.</p>
    <div class="links">
      <a class="btn line" href="https://wa.me/${WHATSAPP}" aria-label="WhatsApp us on ${WHATSAPP_SHOWN}">WhatsApp us</a>
      <a class="btn line" href="mailto:${EMAIL}">Email us</a>
    </div>
    <button class="btn primary wide" data-act="join" style="margin-top:14px">Add your business</button>`;
}

function joinPage(): string {
  return `
    <button class="back" data-act="back" aria-label="Back">${ICON.back}</button>
    <h1 tabindex="-1">Simple pricing</h1>
    <p class="meta">Cancel any time.</p>
    <div class="plan">
      <small>FREE</small><h3>Free listing</h3>
      <ul><li>Your business page</li><li>Opening times</li><li>Call &amp; directions buttons</li></ul>
    </div>
    <div class="plan plus">
      <small>PLUS</small><h3>£5 a month</h3>
      <ul><li>Offers on the home screen</li><li>Zonie loyalty card</li><li>Alerts to local shoppers</li><li>Top of your area's list</li></ul>
    </div>
    <div class="launch">Launch offer<b>First 50 businesses: Plus free for your first year</b></div>
    <p class="note">No obligation – Plus won't renew automatically.</p>
    <p class="note"><b>Big stores over 280 m²: £50 a month for year 1</b><br>then £100 a month · Free listing stays free for all</p>
    <a class="btn primary wide" href="${JOIN_URL}">Add your business – free</a>
    <div class="box">
      <p>Prefer to talk? Anthony can set it all up for you.</p>
      <div class="links"><a class="btn line" href="https://wa.me/${WHATSAPP}">WhatsApp ${WHATSAPP_SHOWN}</a><a class="btn line" href="mailto:${EMAIL}">Email us</a></div>
    </div>`;
}

function listSheet(): string {
  const items = state.list.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  const plan = items.length ? planStops(shops(), items, state.near ?? area()) : undefined;
  return `
    <div class="sheet-bg" data-act="closelist">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="My shopping list">
        <h2>My shopping list</h2>
        <p class="meta">One thing per line. Simple Zone finds it all in the fewest stops.</p>
        <textarea data-act="listtext" aria-label="Shopping list, one thing per line" placeholder="bread&#10;phone charger&#10;coffee">${esc(state.list)}</textarea>
        ${
          plan
            ? `<h2>${plural(plan.stops.length, 'stop', 'stops')}</h2>
               ${plan.stops
                 .map((s, i) => businessCard(s.shop, i, s.items, s.distance))
                 .join('')}
               ${plan.missing.length ? `<p class="meta">Not found yet: ${esc(plan.missing.join(', '))}</p>` : ''}`
            : ''
        }
        <div class="row"><button class="btn line" data-act="clearlist">Clear</button><button class="btn primary" data-act="closelist-btn">Done</button></div>
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
  go({ name: 'search' });
}

function locate() {
  if (state.near) {
    state.near = undefined;
    render();
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
  const el = t.closest<HTMLElement>('[data-tab],[data-business],[data-quick],[data-filter],[data-area],[data-cat],[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'closelist' && t !== el) return; // tap inside the sheet, not on the dim background
  if (el.dataset.tab) return go({ name: el.dataset.tab as Tab });
  if (el.dataset.business) return go({ name: 'business', id: el.dataset.business, from: tabOf(state.view) });
  if (el.dataset.quick) return runSearch(el.dataset.quick);
  if (el.dataset.area !== undefined) {
    state.areaName = el.dataset.area;
    state.near = undefined;
    save('sz.area', state.areaName);
    return render();
  }
  if (el.dataset.cat !== undefined) {
    state.category = el.dataset.cat;
    return render();
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
    case 'back':
      return go({ name: tabOf(state.view) });
    case 'join':
      return go({ name: 'join', from: tabOf(state.view) });
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
  }, Math.max(0, 1200 - (Date.now() - shownAt)));
});
