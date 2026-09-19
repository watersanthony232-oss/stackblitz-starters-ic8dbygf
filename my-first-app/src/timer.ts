// G2 Companion - Timer Module
// Started by the voice assistant ("Hey Claude, set a timer for X").
// Stays lit on screen counting down until it finishes, then alerts
// (visually - the glasses have no speaker) until dismissed with a tap,
// then switches off.

let countdownTimer: ReturnType<typeof setInterval> | null = null;
let remainingSeconds = 0;
let alerting = false;

function ensureTimerEl(): HTMLDivElement {
  let el = document.getElementById('timer-display') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'timer-display';
    el.className = 'timer-display hidden';
    document.body.appendChild(el);
  }
  return el;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function render() {
  const el = ensureTimerEl();
  el.textContent = alerting ? "Time's up" : formatTime(remainingSeconds);
  el.classList.toggle('timer-alerting', alerting);
}

export function startTimer(totalSeconds: number) {
  if (countdownTimer) clearInterval(countdownTimer);
  remainingSeconds = totalSeconds;
  alerting = false;
  ensureTimerEl().classList.remove('hidden');
  render();

  countdownTimer = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
      alerting = true;
      render();
    } else {
      render();
    }
  }, 1000);
}

export function isTimerAlerting() {
  return alerting;
}

export function isTimerVisible() {
  return !ensureTimerEl().classList.contains('hidden');
}

// Dismisses the finished-alert state and switches the timer display off.
// Only does anything once the timer has actually finished (alerting) -
// doesn't cancel a timer that's still counting down.
export function dismissTimerAlert() {
  if (!alerting) return;
  alerting = false;
  ensureTimerEl().classList.add('hidden');
}
