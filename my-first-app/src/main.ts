// G2 Companion - Core Display Module
// Shows: time+date (top-left), temp (C), speed (mph), speed limit (mph)
// Toggled on/off by a single tap (CLICK_EVENT); long press opens the menu.

import './style.css';
import './notifications';
import { showNotificationsScreen } from './notifications';
import { isMenuOpen, toggleMenu, selectNext, selectPrev, activateSelected } from './menu';
import { showNavigationScreen, hideNavigationScreen } from './nav-screen';
import { showChoices, isChoiceOpen, choiceNext, choicePrev, confirmChoice, hideChoices } from './choice';
import { findNearby, type PoiCategory } from './poi';
import { startCongestionWatcher, setDivertHandler } from './congestion-watcher';
import { showWhereAmI, hideWhereAmI } from './whereami';
import { fetchSpeedLimitMph } from './speedlimit';
import { startVoiceAssistant } from './voice-assistant';
import { isTimerAlerting, dismissTimerAlert } from './timer';
import { showNewsScreen } from './news-screen';
import { hideNewsScreen, isNewsScreenVisible } from './news-screen';
import { waitForEvenAppBridge, OsEventTypeList } from '@evenrealities/even_hub_sdk';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="display" class="display hidden">
    <div class="row-top">
      <span id="time"></span>
      <span id="date"></span>
    </div>
    <div id="temp" class="row-temp"></div>
    <div class="row-speed">
      <span id="speed"></span>
      <span id="limit"></span>
    </div>
  </div>
`;

const displayEl = document.getElementById('display')!;
const timeEl = document.getElementById('time')!;
const dateEl = document.getElementById('date')!;
const tempEl = document.getElementById('temp')!;
const speedEl = document.getElementById('speed')!;
const limitEl = document.getElementById('limit')!;

let displayVisible = false;
let lastPosition: GeolocationPosition | null = null;

function toggleDisplay() {
  displayVisible = !displayVisible;
  displayEl.classList.toggle('hidden', !displayVisible);
}

function showPoiResults(category: PoiCategory) {
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const results = await findNearby(category, pos.coords.latitude, pos.coords.longitude);
    let el = document.getElementById('poi-results') as HTMLDivElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'poi-results';
      el.className = 'poi-results';
      document.body.appendChild(el);
    }
    if (results.length === 0) {
      el.innerHTML = '<div class="poi-line">No results found.</div>';
    } else {
      el.innerHTML = results
        .map((r) => `<div class="poi-line">${r.name} - ${Math.round(r.distanceMeters)}m</div>`)
        .join('');
    }
    el.classList.remove('hidden');
  });
}

function updateClock() {
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  dateEl.textContent = now.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

async function fetchWeather(lat: number, lon: number) {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`
    );
    const data = await res.json();
    const c = Math.round(data.current.temperature_2m);
    tempEl.textContent = `${c}°C`;
  } catch (e) {
    tempEl.textContent = '--°C';
    console.error('weather fetch failed', e);
  }
}

function metersPerSecondToMph(mps: number) {
  return Math.round(mps * 2.23694);
}

let lastKnownLimitMph: number | null = null;

function ensureSpeedWarningEl(): HTMLDivElement {
  let el = document.getElementById('speed-warning') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'speed-warning';
    el.className = 'speed-warning hidden';
    document.body.appendChild(el);
  }
  return el;
}

function setOverLimit(mph: number, limit: number | null) {
  const isOver = limit != null && mph >= limit;
  speedEl.classList.toggle('speed-over-limit', isOver);
  const warningEl = ensureSpeedWarningEl();
  warningEl.textContent = isOver ? `${mph}` : '';
  warningEl.classList.toggle('hidden', !isOver);
}

function updateSpeedFromPosition(pos: GeolocationPosition) {
  const mph = pos.coords.speed != null ? metersPerSecondToMph(pos.coords.speed) : 0;
  speedEl.textContent = `${mph} mph`;
  setOverLimit(mph, lastKnownLimitMph);

  fetchSpeedLimitMph(pos.coords.latitude, pos.coords.longitude).then((limit) => {
    lastKnownLimitMph = limit;
    limitEl.textContent = limit != null ? `limit ${limit}` : 'limit --';
    setOverLimit(mph, limit);
  });
}

function refreshLocation() {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      lastPosition = pos;
      updateSpeedFromPosition(pos);
      fetchWeather(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => console.error('geolocation error', err),
    { enableHighAccuracy: true }
  );
}

// Clock ticks every second
setInterval(updateClock, 1000);
updateClock();

// GPS + speed refresh every 20s
setInterval(refreshLocation, 20000);
refreshLocation();

// Weather refresh every 15 min (separate from GPS refresh rate)
setInterval(() => {
  if (lastPosition) fetchWeather(lastPosition.coords.latitude, lastPosition.coords.longitude);
}, 15 * 60 * 1000);

// --- Even Hub SDK wiring ---
// Confirmed against the real SDK: waitForEvenAppBridge() resolves the
// bridge, and bridge.onEvenHubEvent() delivers system touch events via
// event.sysEvent.eventType (OsEventTypeList enum).
async function initInputHandling() {
  const bridge = await waitForEvenAppBridge();
  bridge.onEvenHubEvent((event: any) => {
    const sysEvent = event.sysEvent;
    if (!sysEvent) return;
    if (sysEvent.eventType === OsEventTypeList.CLICK_EVENT) {
      if (isTimerAlerting()) {
        dismissTimerAlert();
      } else if (isChoiceOpen()) {
        confirmChoice();
      } else if (isMenuOpen()) {
        const chosen = activateSelected();
        if (chosen === 'navigation') {
          showChoices('Navigation mode', [
            { id: 'driving', label: 'Driving' },
            { id: 'walking', label: 'Walking' },
          ], (mode) => showNavigationScreen(mode));
        } else if (chosen === 'poi') {
          showChoices('Points of Interest', [
            { id: 'petrol', label: 'Petrol stations' },
            { id: 'supermarket', label: 'Supermarkets' },
            { id: 'pub', label: 'Pubs / wine bars' },
          ], (category) => showPoiResults(category));
        } else if (chosen === 'whereami') {
          showWhereAmI();
        } else if (chosen === 'notifications') {
          showNotificationsScreen();
        } else if (chosen === 'news') {
          showNewsScreen();
        } else if (chosen) {
          console.log('menu item chosen:', chosen, '(screen not built yet)');
        }
      } else if (document.getElementById('nav-screen') && !document.getElementById('nav-screen')!.classList.contains('hidden')) {
        hideNavigationScreen();
      } else if (document.getElementById('poi-results') && !document.getElementById('poi-results')!.classList.contains('hidden')) {
        document.getElementById('poi-results')!.classList.add('hidden');
      } else if (document.getElementById('whereami') && !document.getElementById('whereami')!.classList.contains('hidden')) {
        hideWhereAmI();
      } else {
        toggleDisplay();
      }
    } else if (sysEvent.eventType === OsEventTypeList.LONG_PRESS_EVENT) {
      if (isChoiceOpen()) {
        hideChoices();
      } else {
        toggleMenu();
      }
    } else if (sysEvent.eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
      if (isChoiceOpen()) choicePrev();
      else selectPrev();
    } else if (sysEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      if (isChoiceOpen()) choiceNext();
      else selectNext();
    } else if (sysEvent.eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      // Trying to claim double-tap for our own News screen, in place of
      // the native Even Realities double-tap display. Whether this
      // actually overrides the native screen (rather than the system
      // reserving double-tap globally) is unconfirmed - only real-device
      // testing will show if this fires at all.
      if (isNewsScreenVisible()) {
        hideNewsScreen();
      } else {
        showNewsScreen();
      }
    }
  });
}

initInputHandling();

setDivertHandler(() => showNavigationScreen('driving'));
startCongestionWatcher();
startVoiceAssistant();
