import {
  byId, textEl, createBoard, loadMenu, markActive, followHash,
  positionAt, showPosition, renderMoveList, highlightMove, stepKeys,
} from './viewer.js';

// The tutor may move pieces freely to show "what if" ideas; stepping through
// the lesson always restores the lesson's own position.
const board = createBoard(byId('board'), { movable: { free: true, color: 'both' } });
const menu = byId('lesson-menu');

const state = {
  lesson: null,
  chapter: null,
  step: 0, // 0 = starting position, n = after the n-th move
  showMoves: false, // moves not reached yet are hidden until the tutor reveals them
};

function openLesson(lesson) {
  state.lesson = lesson;
  markActive(menu, lesson.id);
  byId('lesson-title').textContent = lesson.title;
  byId('step-controls').hidden = false;
  openChapter(0);
}

function openChapter(index) {
  const lesson = state.lesson;
  state.chapter = lesson.chapters[index];

  const tabs = byId('chapters');
  tabs.replaceChildren();
  if (lesson.chapters.length > 1) {
    lesson.chapters.forEach((chapter, i) => {
      const tab = textEl('button', i === index ? 'active' : null, chapter.title);
      tab.addEventListener('click', () => openChapter(i));
      tabs.append(tab);
    });
  }

  renderMoveList(byId('move-list'), state.chapter.steps, showStep);
  state.showMoves = false;
  byId('btn-show-moves').hidden = state.chapter.steps.length === 0;
  showStep(0);
}

function showStep(n) {
  const chapter = state.chapter;
  if (!chapter) return;
  const total = chapter.steps.length;
  state.step = Math.max(0, Math.min(n, total));
  showPosition(board, chapter, state.step);

  const pos = positionAt(chapter, state.step);
  byId('move-label').textContent = state.step === 0 ? '' : `${pos.number} ${pos.san}`;
  byId('lesson-text').textContent = state.step === 0 ? chapter.intro : pos.comment;
  byId('step-count').textContent = total === 0 ? '' : `${state.step} / ${total}`;

  byId('btn-first').disabled = byId('btn-prev').disabled = state.step === 0;
  byId('btn-last').disabled = byId('btn-next').disabled = state.step === total;
  updateMoveList();
}

function updateMoveList() {
  highlightMove(byId('move-list'), state.step, !state.showMoves);
  byId('btn-show-moves').textContent = state.showMoves ? 'Hide moves' : 'Show moves';
}

byId('btn-first').addEventListener('click', () => showStep(0));
byId('btn-prev').addEventListener('click', () => showStep(state.step - 1));
byId('btn-next').addEventListener('click', () => showStep(state.step + 1));
byId('btn-last').addEventListener('click', () => showStep(Infinity));
byId('btn-show-moves').addEventListener('click', () => {
  state.showMoves = !state.showMoves;
  updateMoveList(); // leaves the board alone, in case pieces were moved by hand
});
stepKeys((delta) => showStep(state.step + delta), () => state.chapter !== null);

const lessons = await loadMenu(menu, '/api/lessons', 'No lessons yet. Add .pgn files to the lessons folder.');
if (lessons) followHash(lessons, openLesson);
