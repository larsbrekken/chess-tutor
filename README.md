# Chess Tutor

A teaching board for chess tutors. The tutor shows it to a class, for example on a projector, to explain chess concepts. It runs on the tutor's own computer or as a public website.

## Features

- A library of lessons on chess concepts, each a step-by-step demonstration with explanations, arrows and highlighted squares
- Puzzles: play the move the class suggests and the app says whether it's right, with an option to show the solution
- A board editor for setting up any position and moving pieces from there

The app doesn't evaluate moves or need user accounts.

## Tech stack

- Python with [Flask](https://flask.palletsprojects.com/)
- [python-chess](https://python-chess.readthedocs.io/) reads the lesson and puzzle files
- The board is [chessground](https://github.com/lichess-org/chessground) (the lichess board), included in `static/vendor/` so the app works offline

## Running

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python app.py
```

This opens the app in your browser at http://127.0.0.1:8765/.

To test it the way it runs on the public site, start it with the production server instead:

```sh
.venv/bin/gunicorn app:app --bind 127.0.0.1:8000
```

and open http://127.0.0.1:8000/.

## Giving a lesson

Open **Lessons**, pick a lesson from the menu, and step through it:

- **→** / **←** (or the ▶ ◀ buttons) step forward and back. **Home** and **End** jump to the start and end.
- Click a move in the move list to jump to it.
- You can move pieces by hand or right-click-drag to draw arrows to show an idea. Stepping puts the lesson's position back.

## Adding lessons

Each lesson is a [PGN](https://en.wikipedia.org/wiki/Portable_Game_Notation) file in the `lessons/` folder. A subfolder is a category: `lessons/checkmates/queen-and-rook.pgn` appears under "Checkmates". Add a file and refresh the browser to see it; no restart needed. A file with a mistake, such as an illegal move, is listed in the menu under "Could not load" with the problem.

See [lessons/checkmates/queen-and-rook.pgn](lessons/checkmates/queen-and-rook.pgn) for a complete example. The parts of a lesson file:

| PGN | Meaning |
| --- | --- |
| `[Event "..."]` | Lesson title. Without it, the file name is used. |
| `[SetUp "1"]` and `[FEN "..."]` | Starting position. Leave both out to start from the normal opening position. |
| `[Orientation "black"]` | Show the board from Black's side. |
| `{ ... }` before the first move | Introduction, shown at the starting position. |
| Moves | The demonstration. Both sides' moves are written out. |
| `{ ... }` after a move | Explanation shown at that step. |
| `[%cal Gh4a4]` in a comment | Arrow from h4 to a4. Colours: `G` green, `R` red, `Y` yellow, `B` blue. Separate several with commas. |
| `[%csl Rc8]` in a comment | Highlights the c8 square, using the same colours. |

A file can hold several games one after another. They become chapters of the lesson, each with its own title from its `[Event]`. Side lines (variations in parentheses) are currently ignored.

To control the order of categories and lessons, start the names with numbers, such as `01-checkmates/02-queen-and-rook.pgn`. The numbers aren't shown in the app.

**Writing lessons in lichess:** create a [study](https://lichess.org/study), set up the position, play the moves, write comments and right-click-drag to draw arrows. Then export it as PGN and save the file in `lessons/`.

## Puzzles

Open **Puzzles** and pick one from the menu. The board shows the position and the question, for example "White to move and mate in 2".

- Play the move the class suggests on the board. Only the side to move can be moved, and only legal moves are possible.
- A correct move is confirmed and the opponent's reply is played automatically. Then the class looks for the next move.
- A wrong move is marked and taken back after a moment, so the class can try again.
- Any checkmating move counts as correct, even if it isn't the one in the file.
- **Show solution** reveals the moves and their explanations. Step through them as in a lesson. **Start over** resets the puzzle.

### Adding puzzles

Puzzles are PGN files in the `puzzles/` folder, with subfolders as categories, as for lessons. See [puzzles/checkmates/back-rank-mate.pgn](puzzles/checkmates/back-rank-mate.pgn) for an example. The format is the same as for lessons, but the parts mean:

| PGN | Meaning |
| --- | --- |
| `[Event "..."]` | Puzzle title. |
| `[SetUp "1"]` and `[FEN "..."]` | The puzzle position. The side to move in the FEN is the side solving the puzzle. |
| `{ ... }` before the first move | The question. Without it, the app shows "White to move." or "Black to move." |
| Moves | The solution: the solver's moves and the opponent's replies. |
| `{ ... }` after a move | Explanation, shown when the move is found or the solution is shown. |

The board is shown from the solver's side unless `[Orientation]` says otherwise. If a file holds several games, each one is a separate puzzle in the menu.

Only the move in the file is accepted, except that any checkmate is accepted. If the solution includes a pawn promotion, any promotion on the right square is accepted, because the board doesn't ask which piece to promote to.

## Using the board editor

- Drag pieces from the trays on either side onto the board. Or click a piece in a tray (it lights up green) and then click the square to put it on; a piece already there is replaced. Click the tray piece again or press Esc to cancel.
- Drag a piece on the board to move it anywhere. Dropping it on another piece replaces that piece.
- Drag a piece off the board to remove it.
- Click a piece to see its legal moves as dots, as if it were that side's turn. They're only a guide: you can still put the piece anywhere. Castling is shown when the king and rook are on their starting squares; en passant isn't shown.
- **Starting position** and **Clear board** reset the board.

## Publishing the website

The public site is hosted on [Render](https://render.com). Render watches the GitHub repository and redeploys automatically whenever `main` changes, so pushing to GitHub is all it takes to publish a change. The new version is usually live within a few minutes. The settings are in [render.yaml](render.yaml).

### One-time setup

1. Create a Render account and connect it to your GitHub account.
2. In Render, choose **New > Blueprint** and pick the `chess-tutor` repository. Render reads `render.yaml` and creates the web service. The first deploy takes a few minutes; the site is then at an address like `chess-tutor.onrender.com`.
3. Optional: on the free plan the site sleeps after about 15 minutes without visitors, and the next visit takes up to a minute to load. To keep it always on, change the service to a paid plan in Render's dashboard (or change `plan: free` to `plan: starter` in `render.yaml`).

### Using your own domain

1. In Render, open the service, go to **Settings > Custom Domains**, and add your domain (for example `chesstutor.com`, and also `www.chesstutor.com`).
2. Render shows the DNS records to create. Add them at the company you bought the domain from, usually a `CNAME` record for `www` and an `A` or `ALIAS` record for the bare domain.
3. Once the DNS change has spread (minutes to a few hours), Render verifies the domain and sets up HTTPS automatically.

## License

Chess Tutor is free software under the [GNU General Public License v3.0 or later](LICENSE). It uses [chessground](https://github.com/lichess-org/chessground), which is GPL-3.0, so the source code must stay available to everyone who uses the site; every page links to this repository. The puzzles taken from the [lichess puzzle database](https://database.lichess.org/#puzzles) are in the public domain (CC0).
