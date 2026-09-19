// G2 Companion - News Screen
// Shown when "News" is chosen from the menu. Fetches the top stories
// and displays them as a list; refreshes automatically every 15
// minutes while open.

import { fetchTopStories } from './news';

let pollTimer: ReturnType<typeof setInterval> | null = null;

function ensureEl(): HTMLDivElement {
  let el = document.getElementById('news-screen') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'news-screen';
    el.className = 'news-screen hidden';
    document.body.appendChild(el);
  }
  return el;
}

async function refresh() {
  const stories = await fetchTopStories();
  const el = ensureEl();
  if (stories.length === 0) {
    el.innerHTML = '<div class="news-line">No stories available.</div>';
    return;
  }
  el.innerHTML = stories.map((s) => `<div class="news-line">${s.title}</div>`).join('');
}

export function showNewsScreen() {
  ensureEl().classList.remove('hidden');
  refresh();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(refresh, 15 * 60 * 1000);
}

export function hideNewsScreen() {
  ensureEl().classList.add('hidden');
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function isNewsScreenVisible() {
  return !ensureEl().classList.contains('hidden');
}
