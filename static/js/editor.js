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

// Fill a tray with one piece of each kind; pressing on one starts dragging a
// new copy of it onto the board.
function fillTray(tray) {
  const color = tray.dataset.color;
  for (const role of ROLES) {
    const el = document.createElement('piece');
    el.className = `${color} ${role}`;
    el.title = `${color} ${role}`;
    el.addEventListener('mousedown', startDrag);
    el.addEventListener('touchstart', startDrag, { passive: false });
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

fillTray(document.getElementById('tray-black'));
fillTray(document.getElementById('tray-white'));

document.getElementById('btn-start').addEventListener('click', () => {
  board.set({ fen: START_FEN, lastMove: undefined });
  updateLegalMoves();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  board.set({ fen: '8/8/8/8/8/8/8/8', lastMove: undefined });
  updateLegalMoves();
});
