// G2 Companion - Menu Module
// Opened by long press; navigate items with scroll up/down (swipe),
// select with a tap, close with another long press.

export type MenuItemId = 'navigation' | 'whereami' | 'translate' | 'notifications' | 'news' | 'poi';

const ITEMS: { id: MenuItemId; label: string }[] = [
  { id: 'navigation', label: 'Navigation' },
  { id: 'whereami', label: 'Where am I' },
  { id: 'poi', label: 'Points of Interest' },
  { id: 'translate', label: 'Translate' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'news', label: 'News' },
];

let open = false;
let selectedIndex = 0;

function ensureMenuEl(): HTMLDivElement {
  let el = document.getElementById('menu') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'menu';
    el.className = 'menu hidden';
    document.body.appendChild(el);
  }
  return el;
}

function render() {
  const el = ensureMenuEl();
  el.innerHTML = ITEMS.map(
    (item, i) =>
      `<div class="menu-item${i === selectedIndex ? ' selected' : ''}">${item.label}</div>`
  ).join('');
}

export function isMenuOpen() {
  return open;
}

export function openMenu() {
  open = true;
  selectedIndex = 0;
  ensureMenuEl().classList.remove('hidden');
  render();
}

export function closeMenu() {
  open = false;
  ensureMenuEl().classList.add('hidden');
}

export function toggleMenu() {
  if (open) closeMenu();
  else openMenu();
}

export function selectNext() {
  if (!open) return;
  selectedIndex = (selectedIndex + 1) % ITEMS.length;
  render();
}

export function selectPrev() {
  if (!open) return;
  selectedIndex = (selectedIndex - 1 + ITEMS.length) % ITEMS.length;
  render();
}

// Returns the activated item's id, or null if the menu wasn't open.
// The individual screens (navigation / translate / notifications list /
// news) are not built yet - this just reports which one was chosen.
export function activateSelected(): MenuItemId | null {
  if (!open) return null;
  const item = ITEMS[selectedIndex];
  closeMenu();
  return item.id;
}
