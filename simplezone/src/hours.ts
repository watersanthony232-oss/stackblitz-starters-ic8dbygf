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

// ---------- Opening hours typed into the sheet ----------

const DAY_WORDS: [RegExp, number[]][] = [
  [/^(daily|every ?day|7 days( a week)?|mon(day)?-sun(day)?)$/, [0, 1, 2, 3, 4, 5, 6]],
  [/^weekdays?$/, [1, 2, 3, 4, 5]],
  [/^weekends?$/, [0, 6]],
];
const DAY_RE = /^(sun|mon|tue|wed|thu|fri|sat)/;
const DAY = '(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*\\.?';
const TIME = '\\d{1,2}(?:[:.]\\d{2})?\\s*(?:am|pm)?|noon|midday|midnight';
const RANGE = `(?:${TIME})\\s*-\\s*(?:${TIME})`;
const SEGMENT = new RegExp(
  `(daily|every ?day|7 days(?: a week)?|weekdays?|weekends?|${DAY}(?:\\s*(?:-|&|and|,)\\s*${DAY})*)\\s*:?\\s*(closed|${RANGE}(?:\\s*(?:,|&|and)\\s*${RANGE})*)`,
  'g',
);

function dayIndex(word: string): number {
  const m = DAY_RE.exec(word);
  return m ? ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(m[1]) : -1;
}

/** "mon-fri" -> [1..5], "sat & sun" -> [6, 0]. Empty if not understood. */
function parseDays(text: string): number[] {
  const t = text.replace(/\s+/g, ' ').trim();
  for (const [re, days] of DAY_WORDS) if (re.test(t)) return days;
  const out: number[] = [];
  for (const part of t.split(/\s*(?:,|&|and)\s*/)) {
    const [a, b] = part.split(/\s*-\s*/);
    const from = dayIndex(a);
    if (from < 0) return [];
    if (b === undefined) {
      out.push(from);
      continue;
    }
    const to = dayIndex(b);
    if (to < 0) return [];
    for (let d = from; ; d = (d + 1) % 7) {
      out.push(d);
      if (d === to) break;
    }
  }
  return out;
}

/** "9", "9:30", "5pm", "noon" -> minutes, and whether am/pm was given. */
function parseTime(t: string): { min: number; ampm: boolean } | undefined {
  const s = t.trim();
  if (s === 'noon' || s === 'midday') return { min: 720, ampm: true };
  if (s === 'midnight') return { min: 0, ampm: true };
  const m = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/.exec(s);
  if (!m) return undefined;
  let h = Number(m[1]);
  const mins = Number(m[2] ?? 0);
  if (h > 24 || mins > 59) return undefined;
  if (m[3]) {
    if (h < 1 || h > 12) return undefined;
    h = (h % 12) + (m[3] === 'pm' ? 12 : 0);
  }
  return { min: h * 60 + mins, ampm: !!m[3] };
}

function parseRange(text: string): Span | undefined {
  const [a, b] = text.split(/\s*-\s*/);
  const o = parseTime(a);
  const c = parseTime(b);
  if (!o || !c) return undefined;
  let open = o.min;
  let close = c.min;
  // "9-5" means 9am to 5pm.
  if (!c.ampm && close <= open && close < 720 && close + 720 > open) close += 720;
  // Closing at or after midnight, e.g. "6pm-2am" or "12-24".
  if (close <= open) close += 1440;
  if (open >= 1440 || close - open > 1440) return undefined;
  return [open, close];
}

/**
 * Opening hours typed by the business, e.g. "Mon-Fri 9am-5pm, Sat 10-4, Sun closed".
 * Returns undefined unless every part is understood, so the app never guesses "open now".
 * Days not mentioned count as closed.
 */
export function parseHours(text: string): Week | undefined {
  const t = text
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+to\s+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return undefined;
  const w: Week = [[], [], [], [], [], [], []];
  let found = false;
  const left = t.replace(SEGMENT, (_all, daysText: string, timesText: string) => {
    const days = parseDays(daysText);
    if (!days.length) return _all;
    const spans: Span[] = [];
    if (timesText !== 'closed') {
      for (const r of timesText.split(/\s*(?:,|&|and)\s*/)) {
        let span = parseRange(r);
        if (!span) return _all;
        // A second session without am/pm, e.g. "12-2, 5-10": the 5-10 is in the evening.
        const prev = spans[spans.length - 1];
        if (prev && span[0] < prev[1] && span[0] < 720 && !/am|pm|noon|midday|midnight/.test(r)) {
          span = [span[0] + 720, span[1] + 720];
        }
        if (prev && span[0] < prev[1]) return _all;
        spans.push(span);
      }
    }
    for (const d of days) w[d] = spans;
    found = true;
    return ' ';
  });
  // Anything left over that isn't punctuation means we didn't understand it.
  if (!found || /[a-z0-9]/.test(left)) return undefined;
  return w;
}
