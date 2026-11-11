import {
  byId, textEl, createBoard, loadMenu, markActive, followHash,
  positionAt, showPosition, renderMoveList, highlightMove, stepKeys,
} from './viewer.js';

const REPLY_DELAY = 700; // ms before the opponent's reply is played
const RETRY_DELAY = 900; // ms a wrong move stays on the board before it is taken back

const board = createBoard(byId('board'), {
  movable: { free: false, events: { after: onMove } },
});
const menu = byId('puzzle-menu');

const state = {
  puzzle: null,
  step: 0, // solution moves played so far
  // solving: waiting for the solver's move; waiting: a reply or take-back is
  // about to happen; solved: done; solution: stepping through the revealed solution.
  mode: null,
  timer: null,
};

// ---- Board helpers --------------------------------------------------------

const solverColor = () => state.puzzle.turn;

function movesAllowed(pos) {
  return { movable: { free: false, color: solverColor(), dests: new Map(Object.entries(pos.dests)) } };
}

const noMoves = () => ({ movable: { free: false, color: solverColor(), dests: new Map() } });

function later(fn, ms) {
  clearTimeout(state.timer);
  state.timer = setTimeout(fn, ms);
}

// ---- Feedback -------------------------------------------------------------

function feedback(kind, title, detail = '') {
  const box = byId('feedback');
  box.hidden = !kind;
  box.className = `feedback ${kind || ''}`;
  box.replaceChildren();
  if (!kind) return;
  box.append(textEl('strong', null, title));
  if (detail) box.append(textEl('p', null, detail));
}

// ---- Solving --------------------------------------------------------------

function openPuzzle(puzzle) {
  state.puzzle = puzzle;
  markActive(menu, puzzle.id);
  byId('puzzle-title').textContent = puzzle.title;
  byId('puzzle-prompt').textContent = puzzle.intro;
  byId('puzzle-actions').hidden = false;
  renderMoveList(byId('move-list'), puzzle.steps, showSolutionStep);
  startSolving();
}

function startSolving() {
  clearTimeout(state.timer);
  state.step = 0;
  state.mode = 'solving';
  byId('solution').hidden = true;
  byId('btn-solution').hidden = false;
  feedback(null);
  showPosition(board, state.puzzle, 0, movesAllowed(state.puzzle));
}

function onMove(orig, dest) {
  if (state.mode !== 'solving') return;
  const puzzle = state.puzzle;
  const pos = positionAt(puzzle, state.step);
  const expected = puzzle.steps[state.step];

  if (orig === expected.from && dest === expected.to) {
    playCorrect();
  } else if (pos.mates[orig + dest]) {
    // Not the move in the file, but it is checkmate, so it solves the puzzle.
    board.set({ fen: pos.mates[orig + dest], check: true, turnColor: puzzle.turn === 'white' ? 'black' : 'white' });
    finish('Checkmate! Solved.', 'That is a different mate from the one in the solution.');
  } else {
    state.mode = 'waiting';
    board.set(noMoves());
    feedback('wrong', 'Not the right move. Try again.');
    later(() => {
      state.mode = 'solving';
      showPosition(board, puzzle, state.step, movesAllowed(pos));
    }, RETRY_DELAY);
  }
}

function playCorrect() {
  const puzzle = state.puzzle;
  const total = puzzle.steps.length;
  state.step += 1;
  // Re-set the position from the file so castling and promotion come out right.
  showPosition(board, puzzle, state.step, noMoves());
  const move = puzzle.steps[state.step - 1];
  if (state.step === total) {
    finish('Correct! Solved.', move.comment);
    return;
  }

  state.mode = 'waiting';
  feedback('correct', 'Correct! Keep going.', move.comment);
  later(() => {
    state.step += 1; // the opponent's reply
    const reply = puzzle.steps[state.step - 1];
    if (state.step === total) {
      showPosition(board, puzzle, state.step, noMoves());
      finish('Solved!', reply.comment || move.comment);
      return;
    }
    state.mode = 'solving';
    showPosition(board, puzzle, state.step, movesAllowed(reply));
    const opponent = solverColor() === 'white' ? 'Black' : 'White';
    feedback('correct', `Correct! ${opponent} replied ${reply.san}. Find the next move.`, reply.comment || move.comment);
  }, REPLY_DELAY);
}

function finish(title, detail) {
  state.mode = 'solved';
  board.set(noMoves());
  feedback('solved', title, detail);
  byId('btn-solution').hidden = false;
}

// ---- Revealed solution ----------------------------------------------------

function revealSolution() {
  clearTimeout(state.timer);
  state.mode = 'solution';
  byId('solution').hidden = false;
  byId('btn-solution').hidden = true;
  feedback(null);
  // Continue from how far the class got; ← and Home go back to the start.
  showSolutionStep(state.step);
}

function showSolutionStep(n) {
  if (state.mode !== 'solution') revealSolution();
  const puzzle = state.puzzle;
  const total = puzzle.steps.length;
  state.step = Math.max(0, Math.min(n, total));
  // As in lessons, pieces can be moved freely to show ideas.
  showPosition(board, puzzle, state.step, { movable: { free: true, color: 'both', dests: new Map() } });

  const pos = positionAt(puzzle, state.step);
  byId('move-label').textContent = state.step === 0 ? '' : `${pos.number} ${pos.san}`;
  byId('solution-text').textContent = state.step === 0 ? '' : pos.comment;
  byId('step-count').textContent = `${state.step} / ${total}`;
  byId('btn-first').disabled = byId('btn-prev').disabled = state.step === 0;
  byId('btn-last').disabled = byId('btn-next').disabled = state.step === total;
  highlightMove(byId('move-list'), state.step);
}

// ---- Controls -------------------------------------------------------------

byId('btn-restart').addEventListener('click', startSolving);
byId('btn-solution').addEventListener('click', revealSolution);
byId('btn-first').addEventListener('click', () => showSolutionStep(0));
byId('btn-prev').addEventListener('click', () => showSolutionStep(state.step - 1));
byId('btn-next').addEventListener('click', () => showSolutionStep(state.step + 1));
byId('btn-last').addEventListener('click', () => showSolutionStep(Infinity));
stepKeys((delta) => showSolutionStep(state.step + delta), () => state.mode === 'solution');

const puzzles = await loadMenu(menu, '/api/puzzles', 'No puzzles yet. Add .pgn files to the puzzles folder.');
if (puzzles) followHash(puzzles, openPuzzle);
