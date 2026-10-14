// Opening hours and "open now", always in UK time (Europe/London).

/** Minutes after midnight, e.g. 8:30am = 510. Midnight closing is 1440. */
export type Span = [open: number, close: number];
/** Index 0 = Sunday ... 6 = Saturday (same as Date.getDay()). */
export type Week = Span[][];

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Build a week from a short form: { 'mon-fri': '8-20', sat: '10-16' }. */
export function week(spec: Record<string, string>): Week {
  const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const w: Week = [[], [], [], [], [], [], []];
  for (const [days, times] of Object.entries(spec)) {
    const [a, b = a] = days.split('-');
    const from = keys.indexOf(a);
    const to = keys.indexOf(b);
    if (from < 0 || to < 0) throw new Error(`Bad days: ${days}`);
    const spans = times.split(',').map((t) => {
      const [o, c] = t.split('-').map(toMinutes);
      return [o, c] as Span;
    });
    for (let d = from; ; d = (d + 1) % 7) {
      w[d] = spans;
      if (d === to) break;
    }
  }
  return w;
}

/** "8" -> 480, "8:30" -> 510, "24" -> 1440. */
export function toMinutes(t: string): number {
  const [h, m = '0'] = t.trim().split(':');
  return Number(h) * 60 + Number(m);
}

/** "8am", "12:30pm", "12am" (midnight). */
export function formatTime(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const suffix = h24 < 12 ? 'am' : 'pm';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

export function formatSpans(spans: Span[]): string {
  if (!spans.length) return 'Closed';
  return spans.map(([o, c]) => `${formatTime(o)} – ${formatTime(c)}`).join(', ');
}

/** Day of week and minutes after midnight in the UK for the given moment. */
export function ukNow(date = new Date()): { day: number; min: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, min: Number(get('hour')) * 60 + Number(get('minute')) };
}

export type OpenState =
  | { open: true; closes: number }
  | { open: false; opens?: { day: number; min: number } };

export function openState(w: Week, date = new Date()): OpenState {
  const { day, min } = ukNow(date);
  for (const [o, c] of w[day]) {
    if (min >= o && min < c) return { open: true, closes: c };
  }
  // Still open from a span that ran past midnight yesterday (e.g. 6pm – 2am).
  for (const [o, c] of w[(day + 6) % 7]) {
    if (c > 1440 && min < c - 1440) return { open: true, closes: c - 1440 };
    void o;
  }
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7;
    const next = w[d].map((s) => s[0]).filter((o) => i > 0 || o > min).sort((a, b) => a - b)[0];
    if (next !== undefined) return { open: false, opens: { day: d, min: next } };
  }
  return { open: false };
}

/** "Open now · closes 12am", "Closed · opens 7am", "Closed · opens Monday 9am". */
export function openLabel(w: Week, date = new Date()): string {
  const s = openState(w, date);
  if (s.open) return `Open now · closes ${formatTime(s.closes)}`;
  if (!s.opens) return 'Closed';
  const today = ukNow(date).day;
  const when =
    s.opens.day === today ? '' : s.opens.day === (today + 1) % 7 ? 'tomorrow ' : `${DAY_NAMES[s.opens.day]} `;
  return `Closed · opens ${when}${formatTime(s.opens.min)}`;
}

/** Open at or after 9pm today. */
export function opensLate(w: Week, date = new Date()): boolean {
  return w[ukNow(date).day].some(([, c]) => c >= 21 * 60);
}

export function opensSunday(w: Week): boolean {
  return w[0].length > 0;
}
