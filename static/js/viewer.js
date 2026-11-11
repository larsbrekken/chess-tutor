// Shared pieces of the lessons and puzzles pages: the menu, the board, and
// showing a position or the move list of a chapter or puzzle.
import { Chessground } from '../vendor/chessground/dist/chessground.js';

export const byId = (id) => document.getElementById(id);

export function textEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

export function createBoard(element, config = {}) {
  return Chessground(element, {
    fen: '8/8/8/8/8/8/8/8',
    animation: { enabled: true, duration: 250 },
    ...config,
  });
}

// Fetch a library ({categories: [{name, items}], errors}) and fill the menu with
// links to each item. Returns a Map of item id -> item, or null on failure.
export async function loadMenu(menu, url, emptyMessage) {
  let library;
  try {
    const response = await fetch(url);
    library = await response.json();
  } catch (err) {
    menu.replaceChildren(textEl('p', 'error', `Could not load: ${err}`));
    return null;
  }

  const items = new Map();
  menu.replaceChildren();
  if (library.categories.length === 0) menu.append(textEl('p', 'muted', emptyMessage));

  for (const category of library.categories) {
    menu.append(textEl('h2', null, category.name));
    const list = document.createElement('ul');
    for (const item of category.items) {
      items.set(item.id, item);
      const link = textEl('a', null, item.title);
      link.href = `#${encodeURIComponent(item.id)}`;
      link.dataset.id = item.id;
      const li = document.createElement('li');
      li.append(link);
      list.append(li);
    }
    menu.append(list);
  }

  if (library.errors.length > 0) {
    const box = document.createElement('div');
    box.className = 'load-errors';
    box.append(textEl('h2', null, 'Could not load'));
    for (const { file, message } of library.errors) {
      const p = document.createElement('p');
      p.append(textEl('strong', null, file), document.createElement('br'), message);
      box.append(p);
    }
    menu.append(box);
  }
  return items;
}

export function markActive(menu, id) {
  for (const link of menu.querySelectorAll('a[data-id]')) {
    link.classList.toggle('active', link.dataset.id === id);
  }
}

// Open the item named in the URL (#id) now and whenever the URL changes.
export function followHash(items, open) {
  const openFromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (items.has(id)) open(items.get(id));
  };
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
}

// The position after `n` moves: the chapter itself for n = 0, else its n-th step.
export function positionAt(chapter, n) {
  return n === 0 ? chapter : chapter.steps[n - 1];
}

// Put the position after `n` moves on the board, with its arrows and highlights.
export function showPosition(board, chapter, n, extra = {}) {
  const pos = positionAt(chapter, n);
  board.set({
    orientation: chapter.orientation,
    fen: pos.fen,
    turnColor: pos.turn,
    check: pos.check,
    lastMove: n === 0 ? undefined : [pos.from, pos.to],
    ...extra,
  });
  board.setShapes([]); // clear anything drawn by hand
  board.setAutoShapes(pos.shapes);
}

// Fill `list` with clickable moves; clicking move i calls onSelect(i), 1-based.
export function renderMoveList(list, steps, onSelect) {
  list.replaceChildren();
  steps.forEach((step, i) => {
    // Number White's moves, and a Black move that starts the line.
    if (!step.number.endsWith('...') || i === 0) {
      list.append(textEl('span', 'move-number', step.number));
    }
    const move = textEl('button', 'move', step.san);
    move.dataset.step = i + 1;
    move.addEventListener('click', () => onSelect(i + 1));
    list.append(move);
  });
}

export function highlightMove(list, n) {
  for (const move of list.querySelectorAll('.move')) {
    move.classList.toggle('current', Number(move.dataset.step) === n);
  }
}

// Arrow keys, Home and End call step(delta) / step(±Infinity) while enabled() is true.
export function stepKeys(step, enabled) {
  document.addEventListener('keydown', (event) => {
    const keys = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
    if (event.key in keys && enabled()) {
      event.preventDefault();
      step(keys[event.key]);
    }
  });
}
