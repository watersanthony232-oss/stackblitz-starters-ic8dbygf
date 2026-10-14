import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/roboto/400-italic.css';
import './style.css';

import { AREAS, findArea, formatMiles, type Area } from './areas';
import { DAY_NAMES, formatSpans, openLabel, openState, ukNow } from './hours';
import { planStops, search, splitArea, type Filters, type Place } from './search';
import { SHOPS, type Shop } from './shops';

const JOIN_URL = 'https://simplezone.auroraglance.com/join';
const WHATSAPP = '447367414672';
const EMAIL = 'hello@auroraglance.com';
const QUICK = ['coffee', 'cider', 'massage', 'nails', 'haircut', 'phone charger', 'bread', 'takeaway'];
const SIZES = [
  { z: 1, label: 'Normal text' },
  { z: 1.2, label: 'Bigger text' },
  { z: 1.4, label: 'Biggest text' },
];

const MARK = `<svg viewBox="228 203 1040 610" aria-hidden="true"><defs><path id="szs" d="M486 213 L893 213 L780 345 L486 345 A50 50 0 0 0 486 445 L690 445 A179 179 0 0 1 690 803 L238 803 L370 673 L690 673 A49 49 0 0 0 690 575 L486 575 A181 181 0 0 1 486 213 Z"/><mask id="szgap" maskUnits="userSpaceOnUse" x="228" y="203" width="1040" height="610"><rect x="228" y="203" width="1040" height="610" fill="#fff"/><use href="#szs" fill="#000" stroke="#000" stroke-width="22" stroke-linejoin="round"/></mask></defs><path fill="#0A2551" mask="url(#szgap)" d="M893 213 L1258 213 L1040 673 L1258 673 L1148 803 L765 803 L880 673 L1035 345 L780 345 Z"/><use href="#szs" fill="#04A4A2"/></svg>`;

type View = { name: 'home' } | { name: 'shop'; id: string } | { name: 'join' } | { name: 'about' };

const state = {
  view: { name: 'home' } as View,
  query: '',
  searched: false,
  areaName: '',
  near: undefined as Place | undefined,
  locating: false,
  locError: '',
  filters: {} as Filters,
  size: Number(load('sz.size') ?? 0) || 0,
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

const app = document.getElementById('app')!;

function area(): Area | undefined {
  return state.areaName ? findArea(state.areaName) : undefined;
}

function go(view: View) {
  if (state.view.name === 'home') state.scrollHome = window.scrollY;
  state.view = view;
  render();
  window.scrollTo(0, view.name === 'home' ? state.scrollHome : 0);
}

// ---------- Rendering ----------

function render() {
  document.documentElement.style.setProperty('--z', String(SIZES[state.size].z));
  const v = state.view;
  const body =
    v.name === 'shop' ? shopPage(v.id) : v.name === 'join' ? joinPage() : v.name === 'about' ? aboutPage() : homePage();
  app.innerHTML = `
    <header class="top">
      <button class="brand" data-go="home" aria-label="Simple Zone home"><span class="mark">${MARK}</span><b>Simple Zone</b></button>
      <nav class="toplinks"><button data-go="about">About</button><button data-go="join">Add your shop</button></nav>
    </header>
    <div class="preview"><b>Preview:</b> listings marked “Example” are not real businesses.</div>
    <main>${body}<p class="foot">Simple Zone · by Aurora Glance</p></main>
    ${state.showList ? listSheet() : ''}`;
}

function homePage(): string {
  const a = area();
  const what = state.query;
  const split = splitArea(what);
  const effArea = a ?? split.area;
  const results = search(SHOPS, { what: split.what, area: effArea, near: state.near, filters: state.filters });
  const f = state.filters;
  const where = state.near ? 'near you' : effArea ? `in ${effArea.name}` : 'in Hampshire';
  const count = split.what
    ? `${results.length} ${results.length === 1 ? 'shop sells' : 'shops sell'} “${esc(split.what)}”${state.near || effArea ? ', nearest first' : ''}`
    : `${results.length} ${results.length === 1 ? 'shop' : 'shops'} ${where}`;

  return `
    <button class="sizebtn" data-act="size">Aa ${SIZES[state.size].label}</button>
    <p class="tagline">Local first – less driving, more living.</p>
    <form class="searchbox ${state.searched ? 'inline' : ''}" data-act="search" role="search">
      <input name="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="${state.searched ? 'What do you need? e.g. phone charger' : 'What do you need?'}" value="${esc(what)}" aria-label="What do you need?">
      <button class="btn-orange" type="submit">Search</button>
    </form>
    <div class="chips"><span class="label">Tap to find the nearest:</span>
      ${QUICK.map((q) => `<button class="chip" data-quick="${esc(q)}">${esc(q)}</button>`).join('')}
    </div>
    <button class="listbtn" data-act="list">🛒 My shopping list – find it all in the fewest stops</button>
    <div class="chips">
      <select class="chip" data-act="area" aria-label="Area">
        <option value="">All areas</option>
        ${AREAS.map((x) => `<option ${x.name === state.areaName ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select>
      <button class="chip near ${state.near ? 'on' : ''}" data-act="near">${state.locating ? 'Finding you…' : state.near ? 'Nearest first ✓' : 'Near me'}</button>
      ${filterChip('openNow', 'Open now', f.openNow)}
      ${filterChip('openLate', 'Open late', f.openLate)}
      ${filterChip('openSunday', 'Open Sunday', f.openSunday)}
      ${filterChip('student', '🎓 Student discount', f.student)}
    </div>
    ${state.locError ? `<p class="msg err">${esc(state.locError)}</p>` : ''}
    <p class="count">${count}</p>
    ${results.map((r) => shopCard(r.shop, r.matched, r.distance)).join('') || noResults()}
    <section class="cta">
      <h3>Own a business in Hampshire?</h3>
      <p>Get your shop on Simple Zone for free. Customers can find what you sell, see when you're open and get directions.</p>
      <button class="btn-orange" data-go="join">Add your shop - free</button>
    </section>`;
}

function filterChip(key: keyof Filters, label: string, on?: boolean) {
  return `<button class="chip ${on ? 'on' : ''}" data-filter="${key}" aria-pressed="${!!on}">${label}</button>`;
}

function noResults(): string {
  return `<div class="box"><b>No shops found yet.</b><br>Try another word, pick “All areas”, or turn off a filter. Know a shop that sells it? Tell them about Simple Zone – it's free to join.</div>`;
}

function badges(shop: Shop): string {
  return (
    (shop.example ? '<span class="badge example">EXAMPLE</span>' : '') +
    (shop.offer ? '<span class="badge offer">OFFER</span>' : '') +
    (shop.plus && !shop.example ? '<span class="badge plus">PLUS</span>' : '')
  );
}

function openLine(shop: Shop): string {
  if (!shop.hours) return shop.hoursText ? `<p class="meta">${esc(shop.hoursText)}</p>` : '';
  const open = openState(shop.hours).open;
  return `<p class="open ${open ? '' : 'closed'}">${esc(openLabel(shop.hours))}</p>`;
}

function shopCard(shop: Shop, matched: string[], distance?: number): string {
  const meta = [shop.category, shop.area, distance !== undefined ? formatMiles(distance) : ''].filter(Boolean).join(' · ');
  const sells = matched.length
    ? `<p class="sells">Sells: ${matched.map((m) => `<mark>${esc(m)}</mark>`).join(', ')}</p>`
    : `<p class="sells">${esc(shop.sells.slice(0, 5).join(', '))}${shop.sells.length > 5 ? '…' : ''}</p>`;
  return `
    <button class="shop" data-shop="${shop.id}">
      <h3>${esc(shop.name)}</h3>${badges(shop)}
      ${shop.studentDiscount ? '<br><span class="badge student">STUDENT DISCOUNT</span>' : ''}
      <p class="meta">${esc(meta)}</p>
      ${openLine(shop)}
      ${sells}
      ${shop.offer ? `<div class="offerbox">${esc(shop.offer)}</div>` : ''}
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

function shopPage(id: string): string {
  const shop = SHOPS.find((s) => s.id === id);
  if (!shop) return `<button class="back" data-go="home">← All shops</button><p>That shop isn't on Simple Zone any more.</p>`;
  const today = ukNow().day;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const dest = shop.address ? encodeURIComponent(`${shop.name}, ${shop.address}`) : '';
  const actions = [
    shop.address ? `<a class="btn-line" href="https://maps.apple.com/?daddr=${dest}&ll=${shop.lat},${shop.lon}">Directions</a>` : '',
    shop.phone ? `<a class="btn-line" href="${phoneHref(shop.phone)}">Call</a>` : '',
    shop.whatsapp ? `<a class="btn-line" href="${whatsappHref(shop.whatsapp)}">WhatsApp</a>` : '',
    shop.website ? `<a class="btn-line" href="${esc(shop.website)}">Visit website</a>` : '',
    shop.facebook ? `<a class="btn-line" href="${esc(shop.facebook)}">Facebook</a>` : '',
  ].join('');
  return `
    <div class="shoppage">
      <button class="back" data-go="home">← All shops</button><br>
      <h1>${esc(shop.name)}</h1>${badges(shop)}
      ${shop.studentDiscount ? '<br><span class="badge student">STUDENT DISCOUNT</span>' : ''}
      <p class="meta">${esc(shop.category)} · ${esc(shop.area)}</p>
      ${openLine(shop)}
      ${shop.offer ? `<div class="offerbox"><b>Offer:</b> ${esc(shop.offer)}</div>` : ''}
      ${shop.about ? `<p>${esc(shop.about)}</p>` : ''}
      ${shop.address ? `<p class="meta">📍 ${esc(shop.address)}</p>` : `<p class="meta">📍 ${esc(shop.area)} – call or message for the address.</p>`}
      <div class="actions">${actions}</div>
      ${shop.studentDiscount ? `<div class="box">🎓 <b>Student discount:</b> ${esc(shop.studentDiscount)}</div>` : ''}
      ${shop.parking ? `<div class="box">🅿️ <b>Parking:</b> ${esc(shop.parking)}</div>` : ''}
      <h2>What they sell</h2>
      <div class="chips">${shop.sells.map((s) => `<button class="chip" data-quick="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <h2>Opening times</h2>
      ${
        shop.hours
          ? `<table class="hours">${order
              .map((d) => `<tr class="${d === today ? 'today' : ''}"><td>${DAY_NAMES[d]}</td><td>${esc(formatSpans(shop.hours![d]))}</td></tr>`)
              .join('')}</table>`
          : `<p>${esc(shop.hoursText ?? 'Not listed yet – call or message to check.')}</p>`
      }
      ${shop.hoursNote ? `<p class="meta">${esc(shop.hoursNote)}</p>` : ''}
    </div>`;
}

function joinPage(): string {
  return `
    <button class="back" data-go="home">← All shops</button>
    <h1 style="font-size:1.6rem;margin:10px 0 4px">Simple pricing</h1>
    <p class="meta">Cancel any time.</p>
    <div class="plan">
      <small>FREE</small><h3>Free listing</h3>
      <ul><li>Your shop page</li><li>Opening times</li><li>Call &amp; directions buttons</li></ul>
    </div>
    <div class="plan plus">
      <small>PLUS</small><h3>£5 a month</h3>
      <ul><li>Offers on the home screen</li><li>Zonie loyalty card</li><li>Alerts to local shoppers</li><li>Top of your area's list</li></ul>
    </div>
    <div class="launch">Launch offer<b>First 50 businesses: Plus free for your first year</b></div>
    <p class="meta center">No obligation – Plus won't renew automatically.</p>
    <p class="big-note">Big stores over 280 m²: £50 a month for year 1</p>
    <p class="meta center">then £100 a month · Free listing stays free for all</p>
    <div class="actions" style="justify-content:center">
      <a class="btn-orange" style="text-decoration:none" href="${JOIN_URL}">Add your shop - free</a>
    </div>
    <div class="box">
      Prefer to talk? Anthony can set it all up for you.<br>
      <div class="actions"><a class="btn-line" href="https://wa.me/${WHATSAPP}">WhatsApp 07367 414672</a><a class="btn-line" href="mailto:${EMAIL}">Email us</a></div>
    </div>`;
}

function aboutPage(): string {
  return `
    <button class="back" data-go="home">← All shops</button>
    <h1 style="font-size:1.6rem;margin:10px 0 4px">About Simple Zone</h1>
    <p class="tagline">Local first – less driving, more living.</p>
    <p>Simple Zone is a free local shopping app. Type what you need and it shows the nearest places that have it, whether they're open right now, and how to get there.</p>
    <p>We're starting in Southampton and across Hampshire, and now Stockport too.</p>
    <div class="box"><b>Your privacy</b><br>Simple Zone has no accounts and no adverts. Your location is only used on this phone when you tap Near me, and is never stored or sent to us. Your shopping list stays on this phone.</div>
    <p>Simple Zone is made by Aurora Glance (part of Toz Industries), a small Southampton business making apps and websites.</p>
    <div class="actions"><a class="btn-line" href="https://wa.me/${WHATSAPP}">WhatsApp us</a><a class="btn-line" href="mailto:${EMAIL}">${EMAIL}</a></div>
    <p class="meta"><a href="./privacy.html">Privacy policy</a> · <a href="./support.html">Help</a></p>`;
}

function listSheet(): string {
  const items = state.list.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  const plan = items.length ? planStops(SHOPS, items, state.near ?? area()) : undefined;
  return `
    <div class="sheet-bg" data-act="closelist">
      <div class="sheet" role="dialog" aria-label="My shopping list">
        <h2>🛒 My shopping list</h2>
        <p class="meta">One thing per line. Simple Zone finds it all in the fewest stops.</p>
        <textarea data-act="listtext" placeholder="bread&#10;phone charger&#10;coffee">${esc(state.list)}</textarea>
        ${
          plan
            ? `<h2>${plan.stops.length} ${plan.stops.length === 1 ? 'stop' : 'stops'}</h2>
               ${plan.stops
                 .map(
                   (s, i) => `<button class="stop shop" data-shop="${s.shop.id}"><b>${i + 1}. ${esc(s.shop.name)}${s.distance !== undefined ? ` · ${formatMiles(s.distance)}` : ''}</b>
                   <span class="meta">${esc(s.items.join(', '))}</span>${openLine(s.shop)}</button>`,
                 )
                 .join('')}
               ${plan.missing.length ? `<p class="msg">Not found yet: ${esc(plan.missing.join(', '))}</p>` : ''}`
            : ''
        }
        <div class="row"><button class="btn-line" data-act="clearlist">Clear</button><button class="btn-orange" data-act="closelist-btn">Done</button></div>
      </div>
    </div>`;
}

// ---------- Actions ----------

function runSearch(q: string) {
  state.query = q;
  state.searched = true;
  render();
  document.querySelector('.count')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
  const el = t.closest<HTMLElement>('[data-go],[data-shop],[data-quick],[data-filter],[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'closelist' && t !== el) return; // tap inside the sheet, not on the dim background
  if (el.dataset.go) return go({ name: el.dataset.go as 'home' | 'join' | 'about' });
  if (el.dataset.shop) {
    state.showList = false;
    return go({ name: 'shop', id: el.dataset.shop });
  }
  if (el.dataset.quick) {
    state.view = { name: 'home' };
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
      return render();
    case 'near':
      return locate();
    case 'list':
      state.showList = true;
      return render();
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
    render();
  }
  if (t.dataset.act === 'listtext') {
    state.list = (t as HTMLTextAreaElement).value;
    save('sz.list', state.list);
    render();
    document.querySelector<HTMLTextAreaElement>('.sheet textarea')?.focus();
  }
});

// Refresh "open now" every minute.
setInterval(() => {
  if (!document.querySelector(':focus')) render();
}, 60_000);

render();
