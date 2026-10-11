// Fillkin - find nearby fuel stations and EV chargers.
// Station data comes from OpenStreetMap (Overpass); prices are reported by
// the user and stored on this device.

import './style.css';
import {
  currentPosition,
  directionsUrl,
  formatDistance,
  geocode,
  radiusToMeters,
  type LatLon,
} from './geo';
import { findStations, type FuelType, type Station } from './stations';
import {
  isFavourite,
  latestPrice,
  loadSettings,
  reportPrice,
  saveSettings,
  timeAgo,
  toggleFavourite,
  type PriceReport,
} from './store';
import { highlight, initMap, invalidateSize, showResults } from './map';

const FUEL_LABELS: Record<FuelType, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  lpg: 'LPG',
  e85: 'E85',
};

type SortBy = 'distance' | 'price';

const settings = loadSettings();
let center: (LatLon & { label: string }) | null = null;
let stations: Station[] = [];
let selectedId: string | null = null;
let favouritesOnly = false;
let sortBy: SortBy = 'distance';
let searchAbort: AbortController | null = null;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar">
    <div class="brand">
      <img src="./favicon.svg" alt="" width="28" height="28" />
      <span>Fillkin</span>
    </div>
    <div class="seg" role="tablist" aria-label="Station type">
      <button data-kind="fuel" role="tab">⛽ Fuel</button>
      <button data-kind="ev" role="tab">⚡ EV</button>
    </div>
  </header>

  <section class="controls">
    <form id="search" class="search">
      <input id="q" type="search" placeholder="Search a town, postcode or address" autocomplete="off" />
      <button type="submit" class="btn">Search</button>
      <button type="button" id="locate" class="btn btn-primary" title="Use my location">📍 Near me</button>
    </form>
    <div class="filters">
      <label>Within
        <select id="radius">
          ${[1, 2, 5, 10, 20].map((r) => `<option value="${r}">${r}</option>`).join('')}
        </select>
        <button type="button" id="units" class="link" title="Switch units"></button>
      </label>
      <label id="fuel-filter">Fuel
        <select id="fuel">
          <option value="any">Any</option>
          ${(Object.keys(FUEL_LABELS) as FuelType[])
            .map((f) => `<option value="${f}">${FUEL_LABELS[f]}</option>`)
            .join('')}
        </select>
      </label>
      <label>Sort
        <select id="sort">
          <option value="distance">Nearest</option>
          <option value="price">Cheapest</option>
        </select>
      </label>
      <label>Currency
        <select id="currency">
          ${['£', '€', '$'].map((c) => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </label>
      <label class="check"><input type="checkbox" id="favs" /> ★ Favourites</label>
    </div>
  </section>

  <main class="content">
    <div id="map" class="map"></div>
    <section class="results">
      <div id="status" class="status"></div>
      <ul id="list" class="list"></ul>
    </section>
  </main>

  <footer class="foot">
    Station data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors.
    Prices are reported by you and saved on this device.
  </footer>
`;

const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
const qEl = $<HTMLInputElement>('#q');
const radiusEl = $<HTMLSelectElement>('#radius');
const unitsEl = $<HTMLButtonElement>('#units');
const fuelEl = $<HTMLSelectElement>('#fuel');
const fuelFilterEl = $<HTMLLabelElement>('#fuel-filter');
const sortEl = $<HTMLSelectElement>('#sort');
const favsEl = $<HTMLInputElement>('#favs');
const currencyEl = $<HTMLSelectElement>('#currency');
const statusEl = $<HTMLDivElement>('#status');
const listEl = $<HTMLUListElement>('#list');

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function priceFuel(): PriceReport['fuel'] {
  if (settings.kind === 'ev') return 'kwh';
  return settings.fuel === 'any' ? 'petrol' : settings.fuel;
}

function fuelName(fuel: PriceReport['fuel']): string {
  return fuel === 'kwh' ? 'charging' : FUEL_LABELS[fuel];
}

function priceUnit(fuel: PriceReport['fuel']): string {
  if (fuel === 'kwh') return 'per kWh';
  return settings.currency === '$' ? 'per gal' : 'per L';
}

function formatPrice(p: number): string {
  return `${settings.currency}${p.toFixed(p < 10 ? 2 : 1)}`;
}

function setStatus(text: string, kind: 'info' | 'error' | 'loading' = 'info') {
  statusEl.className = `status status-${kind}`;
  statusEl.textContent = text;
}

function visibleStations(): Station[] {
  let list = stations;
  if (settings.kind === 'fuel' && settings.fuel !== 'any') {
    // Many stations don't tag fuel types; keep untagged ones rather than hide them.
    list = list.filter((s) => s.fuels.length === 0 || s.fuels.includes(settings.fuel as FuelType));
  }
  if (favouritesOnly) list = list.filter((s) => isFavourite(s.id));
  if (sortBy === 'price') {
    const fuel = priceFuel();
    list = [...list].sort((a, b) => {
      const pa = latestPrice(a.id, fuel)?.price ?? Infinity;
      const pb = latestPrice(b.id, fuel)?.price ?? Infinity;
      return pa - pb || a.distanceMeters - b.distanceMeters;
    });
  }
  return list;
}

function stationCard(s: Station): string {
  const fuel = priceFuel();
  const price = latestPrice(s.id, fuel);
  const fav = isFavourite(s.id);
  const tags: string[] = [];
  if (s.kind === 'fuel') {
    for (const f of s.fuels) tags.push(FUEL_LABELS[f]);
  } else {
    if (s.maxPowerKw != null) tags.push(`${Math.round(s.maxPowerKw)} kW`);
    for (const c of s.connectors) tags.push(c.count ? `${c.count}× ${c.name}` : c.name);
    if (s.capacity != null) tags.push(`${s.capacity} bays`);
  }
  const selected = s.id === selectedId;
  return `
    <li class="card${selected ? ' selected' : ''}" data-id="${escapeHtml(s.id)}">
      <div class="card-main">
        <div class="card-head">
          <h3>${escapeHtml(s.name)}</h3>
          <span class="dist">${formatDistance(s.distanceMeters, settings.units)}</span>
        </div>
        ${s.brand ? `<div class="sub">${escapeHtml(s.brand)}</div>` : ''}
        ${s.address ? `<div class="sub">${escapeHtml(s.address)}</div>` : ''}
        ${tags.length ? `<div class="tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        ${s.openingHours ? `<div class="hours">🕒 ${escapeHtml(s.openingHours)}</div>` : ''}
        <div class="price-row">
          ${
            price
              ? `<span class="price">${formatPrice(price.price)}</span><span class="muted">${fuelName(fuel)} ${priceUnit(fuel)} · ${timeAgo(price.reportedAt)}</span>`
              : `<span class="muted">No ${fuelName(fuel)} price yet</span>`
          }
        </div>
        ${
          selected
            ? `<form class="report" data-id="${escapeHtml(s.id)}">
                 <label>Report ${fuelName(fuel)} price (${priceUnit(fuel)})
                   <input name="price" type="number" step="0.001" min="0" inputmode="decimal" required placeholder="${settings.currency}0.00" />
                 </label>
                 <button class="btn btn-primary" type="submit">Save</button>
               </form>`
            : ''
        }
      </div>
      <div class="card-actions">
        <button class="icon fav${fav ? ' on' : ''}" data-action="fav" title="${fav ? 'Remove from' : 'Add to'} favourites" aria-pressed="${fav}">${fav ? '★' : '☆'}</button>
        <a class="icon" href="${directionsUrl(s)}" target="_blank" rel="noopener" title="Directions">↗</a>
      </div>
    </li>`;
}

function render(panToSelection = false) {
  const kindButtons = app.querySelectorAll<HTMLButtonElement>('.seg button');
  kindButtons.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.kind === settings.kind)));
  unitsEl.textContent = settings.units;
  radiusEl.value = String(settings.radius);
  fuelEl.value = settings.fuel;
  fuelFilterEl.hidden = settings.kind !== 'fuel';
  sortEl.value = sortBy;
  favsEl.checked = favouritesOnly;
  currencyEl.value = settings.currency;

  const list = visibleStations();
  listEl.innerHTML = list.map(stationCard).join('');
  if (center) {
    showResults(center, radiusToMeters(settings.radius, settings.units), list, isFavourite);
    highlight(list.find((s) => s.id === selectedId) ?? null, isFavourite, panToSelection);
  }
  if (center && statusEl.className !== 'status status-loading' && statusEl.className !== 'status status-error') {
    const noun = settings.kind === 'fuel' ? 'fuel station' : 'charger';
    setStatus(
      list.length
        ? `${list.length} ${noun}${list.length === 1 ? '' : 's'} near ${center.label}`
        : favouritesOnly
          ? 'No favourites in this area yet.'
          : `No ${noun}s found near ${center.label}. Try a bigger radius.`
    );
  }
}

async function search() {
  if (!center) return;
  searchAbort?.abort();
  const abort = (searchAbort = new AbortController());
  setStatus(`Searching near ${center.label}…`, 'loading');
  try {
    stations = await findStations(
      settings.kind,
      center,
      radiusToMeters(settings.radius, settings.units),
      abort.signal
    );
    selectedId = null;
    statusEl.className = 'status';
  } catch (e) {
    if (abort.signal.aborted) return;
    stations = [];
    setStatus((e as Error).message || 'Search failed.', 'error');
  }
  render();
}

async function useMyLocation() {
  setStatus('Finding your location…', 'loading');
  try {
    const pos = await currentPosition();
    center = { ...pos, label: 'you' };
    qEl.value = '';
    await search();
  } catch (e) {
    setStatus(`${(e as Error).message} Search for a place instead.`, 'error');
  }
}

function update(patch: Partial<typeof settings>) {
  Object.assign(settings, patch);
  saveSettings(settings);
}

// --- events ---------------------------------------------------------------

app.querySelectorAll<HTMLButtonElement>('.seg button').forEach((b) =>
  b.addEventListener('click', () => {
    if (b.dataset.kind === settings.kind) return;
    update({ kind: b.dataset.kind as typeof settings.kind });
    stations = [];
    render();
    search();
  })
);

$<HTMLFormElement>('#search').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = qEl.value.trim();
  if (!q) return;
  setStatus(`Looking up “${q}”…`, 'loading');
  try {
    const place = await geocode(q);
    if (!place) {
      setStatus(`Couldn't find “${q}”.`, 'error');
      return;
    }
    center = place;
    await search();
  } catch (err) {
    setStatus((err as Error).message, 'error');
  }
});

$<HTMLButtonElement>('#locate').addEventListener('click', useMyLocation);

radiusEl.addEventListener('change', () => {
  update({ radius: Number(radiusEl.value) });
  search();
});

unitsEl.addEventListener('click', () => {
  update({ units: settings.units === 'mi' ? 'km' : 'mi' });
  search();
});

fuelEl.addEventListener('change', () => {
  update({ fuel: fuelEl.value as typeof settings.fuel });
  render();
});

sortEl.addEventListener('change', () => {
  sortBy = sortEl.value as SortBy;
  render();
});

currencyEl.addEventListener('change', () => {
  update({ currency: currencyEl.value });
  render();
});

favsEl.addEventListener('change', () => {
  favouritesOnly = favsEl.checked;
  render();
});

listEl.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('a, form')) return;
  const card = target.closest<HTMLLIElement>('.card');
  if (!card) return;
  const id = card.dataset.id!;
  if (target.closest('[data-action="fav"]')) {
    toggleFavourite(id);
    render();
    return;
  }
  selectStation(id === selectedId ? null : id, true);
});

listEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const value = parseFloat((form.elements.namedItem('price') as HTMLInputElement).value);
  if (!isFinite(value) || value <= 0) return;
  reportPrice(form.dataset.id!, priceFuel(), value);
  render();
});

function selectStation(id: string | null, pan: boolean) {
  selectedId = id;
  render(pan);
  if (id) {
    const card = listEl.querySelector<HTMLLIElement>(`.card[data-id="${CSS.escape(id)}"]`);
    card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    card?.querySelector<HTMLInputElement>('input[name="price"]')?.focus({ preventScroll: true });
  }
}

initMap($<HTMLDivElement>('#map'), (id) => selectStation(id, false));
window.addEventListener('resize', invalidateSize);

render();
setStatus('Tap “Near me” or search a place to find stations.');
useMyLocation();
