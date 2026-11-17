import { Chessground } from '../vendor/chessground/dist/chessground.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const ROLES = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];

// Free editing: any piece can be moved anywhere, dropping a piece onto another
// replaces it, and dragging a piece off the board removes it. Clicking a piece
// still shows its legal moves as a guide.
const board = Chessground(document.getElementById('board'), {
  fen: '8/8/8/8/8/8/8/8',
  movable: { free: true, color: 'both' },
  draggable: { deleteOnDropOff: true },
  animation: { enabled: true, duration: 150 },
  events: { change: updateLegalMoves },
});

// Ask the server for the legal moves of the position on the board. Only the
// newest answer is used, in case the board changes again while one is pending.
let latestRequest = 0;

async function updateLegalMoves() {
  const request = ++latestRequest;
  const fen = board.getFen();
  try {
    const response = await fetch(`/api/legal-moves?fen=${encodeURIComponent(fen)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const dests = await response.json();
    if (request === latestRequest) board.set({ movable: { dests: new Map(Object.entries(dests)) } });
  } catch (err) {
    console.error('Could not load legal moves:', err); // the board still works without them
  }
}

// Fill a tray with one piece of each kind. Pressing on one and dragging puts a
// new copy on the board; clicking one selects it for placing with a click.
function fillTray(tray) {
  const color = tray.dataset.color;
  for (const role of ROLES) {
    const el = document.createElement('piece');
    el.className = `${color} ${role}`;
    el.title = `${color} ${role}`;
    el.addEventListener('mousedown', startDrag);
    el.addEventListener('touchstart', startDrag, { passive: false });
    el.addEventListener('pointerdown', rememberPress);
    el.addEventListener('pointerup', clickTrayPiece);
    el.dataset.role = role;
    el.dataset.color = color;
    tray.appendChild(el);
  }
}

function startDrag(event) {
  if (event.button !== undefined && event.button !== 0) return; // left button only
  event.preventDefault();
  const { color, role } = event.currentTarget.dataset;
  board.dragNewPiece({ color, role }, event);
}

// ---- Placing a piece by clicking ------------------------------------------
// Click a tray piece to select it, then click a square to put a copy there
// (replacing any piece on it). One click places one piece, like moving a piece
// by clicking. Clicking the selected tray piece again, or Esc, cancels.

const boardEl = document.getElementById('board');
let selectedSpare = null; // the selected tray <piece> element, or null
let press = null; // where the current press on a tray piece started

function rememberPress(event) {
  press = { el: event.currentTarget, x: event.clientX, y: event.clientY };
}

function clickTrayPiece(event) {
  const el = event.currentTarget;
  // A press that moved is a drag; chessground handles that.
  const moved = !press || press.el !== el || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5;
  press = null;
  if (moved) return selectSpare(null);
  selectSpare(selectedSpare === el ? null : el);
}

function selectSpare(el) {
  if (selectedSpare) selectedSpare.classList.remove('selected');
  selectedSpare = el;
  if (el) {
    el.classList.add('selected');
    board.selectSquare(null); // drop any half-finished click-move on the board
  }
  boardEl.classList.toggle('placing', !!el);
}

function eventPosition(event) {
  const point = event.touches ? event.touches[0] : event;
  return [point.clientX, point.clientY];
}

// Runs before chessground's own handler (capture phase), so while a tray piece
// is selected a click on the board places it instead of selecting or moving.
function placeSelectedSpare(event) {
  if (!selectedSpare) return;
  if (event.button !== undefined && event.button !== 0) return; // keep right-click arrows
  event.preventDefault();
  event.stopPropagation();
  const key = board.getKeyAtDomPos(eventPosition(event));
  if (key) {
    const { color, role } = selectedSpare.dataset;
    board.setPieces(new Map([[key, { color, role }]]));
    updateLegalMoves();
  }
  selectSpare(null);
}

boardEl.addEventListener('mousedown', placeSelectedSpare, true);
boardEl.addEventListener('touchstart', placeSelectedSpare, { capture: true, passive: false });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') selectSpare(null);
});

fillTray(document.getElementById('tray-black'));
fillTray(document.getElementById('tray-white'));

document.getElementById('btn-start').addEventListener('click', () => {
  selectSpare(null);
  board.set({ fen: START_FEN, lastMove: undefined });
  updateLegalMoves();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  selectSpare(null);
  board.set({ fen: '8/8/8/8/8/8/8/8', lastMove: undefined });
  updateLegalMoves();
});
