// G2 Companion - Background Congestion Watcher
// Runs periodically regardless of whether the Navigation screen is open,
// checking the route toward the saved home address for congestion. If
// found, shows a persistent alert (via the choice picker) offering to
// divert or ignore - it stays on screen until the user picks one,
// rather than auto-hiding like a normal notification.

import { fetchDirections, checkForCongestion, getHomeAddress } from './nav';
import { showChoices, isChoiceOpen } from './choice';

const CHECK_INTERVAL_MS = 2 * 60 * 1000; // every 2 minutes
let watcherTimer: ReturnType<typeof setInterval> | null = null;
let alertShowing = false;

// Callback set by main.ts so this module can trigger the nav screen
// without importing it directly (avoids a circular import, since
// nav-screen doesn't need to know about the watcher).
let onDivert: (() => void) | null = null;

export function setDivertHandler(handler: () => void) {
  onDivert = handler;
}

async function checkOnce() {
  if (alertShowing || isChoiceOpen()) return; // don't stack alerts
  const destination = getHomeAddress();
  if (!destination) return;

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const route = await fetchDirections(
      pos.coords.latitude,
      pos.coords.longitude,
      destination,
      'driving'
    );
    if (!route) return;

    const congestion = checkForCongestion(route);
    if (!congestion) return;

    alertShowing = true;
    const title =
      (congestion.level === 'standstill' ? 'Standstill' : 'Slow traffic') +
      (congestion.onMotorway ? ' ahead (motorway)' : ' ahead');

    showChoices(
      title,
      [
        { id: 'divert', label: 'Divert' },
        { id: 'ignore', label: 'Ignore' },
      ],
      (choice) => {
        alertShowing = false;
        if (choice === 'divert' && onDivert) onDivert();
      }
    );
  });
}

export function startCongestionWatcher() {
  if (watcherTimer) return;
  watcherTimer = setInterval(checkOnce, CHECK_INTERVAL_MS);
  // Also check once shortly after starting, rather than waiting the
  // full interval for the first check.
  setTimeout(checkOnce, 15000);
}

export function stopCongestionWatcher() {
  if (watcherTimer) {
    clearInterval(watcherTimer);
    watcherTimer = null;
  }
}
