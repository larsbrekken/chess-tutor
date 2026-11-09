import { Chessground } from '../vendor/chessground/dist/chessground.js';

// The tutor may move pieces freely to show "what if" ideas; stepping through
// the lesson always restores the lesson's own position.
const board = Chessground(document.getElementById('board'), {
  fen: '8/8/8/8/8/8/8/8',
  movable: { free: true, color: 'both' },
  animation: { enabled: true, duration: 250 },
});

const el = (id) => document.getElementById(id);
const menu = el('lesson-menu');

const state = {
  lessons: new Map(), // id -> lesson
  lesson: null,
  chapter: null,
  step: 0, // 0 = starting position, n = after the n-th move
};

// ---- Loading and the lesson menu ------------------------------------------

async function loadLibrary() {
  let library;
  try {
    const response = await fetch('/api/lessons');
    library = await response.json();
  } catch (err) {
    menu.replaceChildren(textEl('p', 'error', `Could not load lessons: ${err}`));
    return;
  }
  renderMenu(library);
  openFromHash();
}

function textEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function renderMenu(library) {
  menu.replaceChildren();
  state.lessons.clear();

  if (library.categories.length === 0) {
    menu.append(textEl('p', 'muted', 'No lessons yet. Add .pgn files to the lessons folder.'));
  }

  for (const category of library.categories) {
    menu.append(textEl('h2', null, category.name));
    const list = document.createElement('ul');
    for (const lesson of category.lessons) {
      state.lessons.set(lesson.id, lesson);
      const item = document.createElement('li');
      const link = textEl('a', null, lesson.title);
      link.href = `#${encodeURIComponent(lesson.id)}`;
      link.dataset.id = lesson.id;
      item.append(link);
      list.append(item);
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
}

function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (state.lessons.has(id)) openLesson(state.lessons.get(id));
}

window.addEventListener('hashchange', openFromHash);

// ---- Showing a lesson -----------------------------------------------------

function openLesson(lesson) {
  state.lesson = lesson;
  for (const link of menu.querySelectorAll('a[data-id]')) {
    link.classList.toggle('active', link.dataset.id === lesson.id);
  }
  el('lesson-title').textContent = lesson.title;
  el('step-controls').hidden = false;
  openChapter(0);
}

function openChapter(index) {
  const lesson = state.lesson;
  state.chapter = lesson.chapters[index];

  const tabs = el('chapters');
  tabs.replaceChildren();
  if (lesson.chapters.length > 1) {
    lesson.chapters.forEach((chapter, i) => {
      const tab = textEl('button', i === index ? 'active' : null, chapter.title);
      tab.addEventListener('click', () => openChapter(i));
      tabs.append(tab);
    });
  }

  renderMoveList();
  showStep(0);
}

function renderMoveList() {
  const list = el('move-list');
  list.replaceChildren();
  state.chapter.steps.forEach((step, i) => {
    // Show the move number before White's moves, and before a Black move that starts the line.
    const showNumber = !step.number.endsWith('...') || i === 0;
    if (showNumber) list.append(textEl('span', 'move-number', step.number));
    const move = textEl('button', 'move', step.san);
    move.dataset.step = i + 1;
    move.addEventListener('click', () => showStep(i + 1));
    list.append(move);
  });
}

function showStep(n) {
  const chapter = state.chapter;
  if (!chapter) return;
  const total = chapter.steps.length;
  state.step = Math.max(0, Math.min(n, total));

  const current = state.step === 0 ? chapter : chapter.steps[state.step - 1];
  board.set({
    orientation: chapter.orientation,
    fen: current.fen,
    turnColor: current.turn,
    check: current.check,
    lastMove: state.step === 0 ? undefined : [current.from, current.to],
  });
  board.setShapes([]); // clear anything the tutor drew by hand
  board.setAutoShapes(current.shapes);

  el('move-label').textContent = state.step === 0 ? '' : `${current.number} ${current.san}`;
  el('lesson-text').textContent = state.step === 0 ? chapter.intro : current.comment;
  el('step-count').textContent = total === 0 ? '' : `${state.step} / ${total}`;

  el('btn-first').disabled = el('btn-prev').disabled = state.step === 0;
  el('btn-last').disabled = el('btn-next').disabled = state.step === total;
  for (const move of el('move-list').querySelectorAll('.move')) {
    move.classList.toggle('current', Number(move.dataset.step) === state.step);
  }
}

// ---- Controls -------------------------------------------------------------

el('btn-first').addEventListener('click', () => showStep(0));
el('btn-prev').addEventListener('click', () => showStep(state.step - 1));
el('btn-next').addEventListener('click', () => showStep(state.step + 1));
el('btn-last').addEventListener('click', () => showStep(Infinity));

document.addEventListener('keydown', (event) => {
  const keys = {
    ArrowLeft: () => showStep(state.step - 1),
    ArrowRight: () => showStep(state.step + 1),
    Home: () => showStep(0),
    End: () => showStep(Infinity),
  };
  if (keys[event.key] && state.chapter) {
    event.preventDefault();
    keys[event.key]();
  }
});

loadLibrary();
