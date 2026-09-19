const fs = require('fs');
const path = 'src/menu.ts';
let content = fs.readFileSync(path, 'utf8');

const old1 = "export type MenuItemId = 'navigation' | 'translate' | 'notifications' | 'news';";
const new1 = "export type MenuItemId = 'navigation' | 'translate' | 'notifications' | 'news' | 'poi';";

const old2 = `const ITEMS: { id: MenuItemId; label: string }[] = [
  { id: 'navigation', label: 'Navigation' },
  { id: 'translate', label: 'Translate' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'news', label: 'News' },
];`;
const new2 = `const ITEMS: { id: MenuItemId; label: string }[] = [
  { id: 'navigation', label: 'Navigation' },
  { id: 'poi', label: 'Points of Interest' },
  { id: 'translate', label: 'Translate' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'news', label: 'News' },
];`;

let ok = true;
if (!content.includes(old1)) { console.log('OLD1_NOT_FOUND'); ok = false; }
if (!content.includes(old2)) { console.log('OLD2_NOT_FOUND'); ok = false; }
if (ok) {
  content = content.replace(old1, new1).replace(old2, new2);
  fs.writeFileSync(path, content);
  console.log('PATCHED_OK');
}
