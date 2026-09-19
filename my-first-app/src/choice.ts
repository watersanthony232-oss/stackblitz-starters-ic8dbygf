// G2 Companion - Generic Choice Picker
// A small reusable overlay for picking one of a few options: used for
// the driving/walking mode picker, and the Points of Interest category
// picker. Navigate with scroll up/down, confirm with a tap, cancel with
// a long press.

export interface ChoiceOption<T extends string> {
  id: T;
  label: string;
}

let open = false;
let currentTitle = '';
let currentOptions: ChoiceOption<string>[] = [];
let selectedIndex = 0;
let onConfirm: ((id: string) => void) | null = null;

function ensureEl(): HTMLDivElement {
  let el = document.getElementById('choice-picker') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'choice-picker';
    el.className = 'choice-picker hidden';
    document.body.appendChild(el);
  }
  return el;
}

function render() {
  const el = ensureEl();
  el.innerHTML =
    `<div class="choice-title">${currentTitle}</div>` +
    currentOptions
      .map(
        (opt, i) =>
          `<div class="choice-item${i === selectedIndex ? ' selected' : ''}">${opt.label}</div>`
      )
      .join('');
}

export function isChoiceOpen() {
  return open;
}

export function showChoices<T extends string>(
  title: string,
  options: ChoiceOption<T>[],
  callback: (id: T) => void
) {
  open = true;
  currentTitle = title;
  currentOptions = options;
  selectedIndex = 0;
  onConfirm = callback as (id: string) => void;
  ensureEl().classList.remove('hidden');
  render();
}

export function hideChoices() {
  open = false;
  ensureEl().classList.add('hidden');
  onConfirm = null;
}

export function choiceNext() {
  if (!open) return;
  selectedIndex = (selectedIndex + 1) % currentOptions.length;
  render();
}

export function choicePrev() {
  if (!open) return;
  selectedIndex = (selectedIndex - 1 + currentOptions.length) % currentOptions.length;
  render();
}

export function confirmChoice() {
  if (!open) return;
  const chosen = currentOptions[selectedIndex];
  const cb = onConfirm;
  hideChoices();
  if (cb) cb(chosen.id);
}
