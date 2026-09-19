// G2 Companion - Notification Overlay Module
// Pops up SMS / WhatsApp / Gmail / Google Calendar alerts on top of
// whatever's currently shown, for 15 seconds, then hides again.
//
// NOTE: actual notification DATA is expected to arrive via MacroDroid
// on the phone. The exact channel the Even Hub SDK uses for host-app ->
// webview custom messages (as opposed to system touch events) is still
// unconfirmed - marked as TODO below. showNotification() itself is
// tested and ready to call once that channel is confirmed.

export interface IncomingNotification {
  source: 'sms' | 'whatsapp' | 'gmail' | 'calendar';
  title: string;
  body: string;
}

const OVERLAY_DURATION_MS = 15000;
const MANUAL_VIEW_DURATION_MS = 20000; // when opened manually via the menu

let hideTimer: ReturnType<typeof setTimeout> | null = null;

function ensureOverlayEl(): HTMLDivElement {
  let el = document.getElementById('notif-overlay') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'notif-overlay';
    el.className = 'notif-overlay hidden';
    el.innerHTML = `
      <div class="notif-source"></div>
      <div class="notif-title"></div>
      <div class="notif-body"></div>
    `;
    document.body.appendChild(el);
  }
  return el;
}

const sourceLabels: Record<IncomingNotification['source'], string> = {
  sms: 'Text',
  whatsapp: 'WhatsApp',
  gmail: 'Gmail',
  calendar: 'Calendar',
};

export function showNotification(n: IncomingNotification) {
  const el = ensureOverlayEl();
  el.querySelector('.notif-source')!.textContent = sourceLabels[n.source];
  el.querySelector('.notif-title')!.textContent = n.title;
  el.querySelector('.notif-body')!.textContent = n.body;
  el.classList.remove('hidden');

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, OVERLAY_DURATION_MS);
}

// Opened manually via the menu's "Notifications" item - shows the
// current/most recent notification (if any) and auto-closes after 20s,
// separate from the 15s auto-popup timing above.
export function showNotificationsScreen() {
  const el = ensureOverlayEl();
  el.classList.remove('hidden');
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, MANUAL_VIEW_DURATION_MS);
}

// TODO: wire this up once we confirm how the Even Hub SDK / Even
// Realities app delivers a custom message from MacroDroid into this
// webview. showNotification() above is ready to receive the data as
// soon as that channel is confirmed against the SDK docs or simulator.
