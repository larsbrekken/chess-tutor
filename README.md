# Chess Tutor

A teaching board for chess tutors. The tutor runs it on their own computer and shows it to a class, for example on a projector, to explain chess concepts.

## Features

- Set up any position by dragging pieces onto and off the board (available now)
- Move pieces from that position to show ideas (available now)
- A built-in library of chess concepts with step-by-step demonstrations (planned)

The app doesn't evaluate moves or need user accounts.

## Tech stack

- Python with [Flask](https://flask.palletsprojects.com/), run locally on the tutor's computer
- The board is [chessground](https://github.com/lichess-org/chessground) (the lichess board), included in `static/vendor/` so the app works offline

## Running

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python app.py
```

This opens the app in your browser at http://127.0.0.1:8765/.

## Using the board

- Drag pieces from the trays on either side onto the board.
- Drag a piece on the board to move it anywhere. Dropping it on another piece replaces that piece.
- Drag a piece off the board to remove it.
- **Starting position** and **Clear board** reset the board.
