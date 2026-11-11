"""Load lessons and puzzles from PGN files.

Each .pgn file in the lessons folder is one lesson. A subfolder groups lessons
into a category (``lessons/checkmates/queen-and-rook.pgn`` is in "Checkmates").
A file may hold several games; each one becomes a chapter of the lesson.

Puzzles use the same format in the puzzles folder, but every game is its own
puzzle: the position is the question and the main line is the solution.

The browser gets every position precomputed, so it only has to display them.
"""

import re
from pathlib import Path

import chess
import chess.pgn

# PGN comment commands such as [%cal Gh4a4], [%csl Rc8], [%clk 0:05:00].
COMMAND_RE = re.compile(r"\[%[^\]]*\]")
# Optional numeric prefix used to control ordering, e.g. "01-checkmates".
ORDER_PREFIX_RE = re.compile(r"^\d+[-_ ]*")

UNCATEGORIZED = "Other"


class LessonError(Exception):
    """A lesson file could not be read."""


def display_name(stem):
    """Turn a file or folder name like '01-queen-and-rook' into 'Queen and rook'."""
    name = ORDER_PREFIX_RE.sub("", stem).replace("-", " ").replace("_", " ").strip()
    return name[:1].upper() + name[1:] if name else stem


def header(game, name):
    """A PGN header value, or None if it is missing or a '?' placeholder."""
    value = game.headers.get(name, "").strip()
    return value if value and value != "?" else None


def clean_comment(text):
    """Comment text without the embedded [%...] commands."""
    return " ".join(COMMAND_RE.sub("", text).split())


def shapes(node):
    """Arrows ([%cal]) and square highlights ([%csl]) as chessground shapes."""
    result = []
    for arrow in node.arrows():
        shape = {"orig": chess.square_name(arrow.tail), "brush": arrow.color}
        if arrow.head != arrow.tail:
            shape["dest"] = chess.square_name(arrow.head)
        result.append(shape)
    return result


def color_name(color):
    return "white" if color == chess.WHITE else "black"


def legal_dests(board, dests=None):
    """Legal moves as chessground expects them: {from square: [to squares]}."""
    dests = {} if dests is None else dests
    for move in board.legal_moves:
        orig, dest = chess.square_name(move.from_square), chess.square_name(move.to_square)
        if dest not in dests.setdefault(orig, []):
            dests[orig].append(dest)  # promotions give the same square several times
    return dests


def editor_dests(board_fen):
    """Legal moves for both sides of a position being set up in the board editor.

    The editor has no side to move, so each piece gets the moves it would have
    if it were its side's turn. Castling counts as allowed whenever king and
    rook are on their starting squares; en passant is never shown.
    Raises ValueError if ``board_fen`` is not a valid piece placement.
    """
    dests = {}
    for color in (chess.WHITE, chess.BLACK):
        board = chess.Board(None)
        board.set_board_fen(board_fen)
        board.turn = color
        board.set_castling_fen("KQkq")
        board.castling_rights = board.clean_castling_rights()
        legal_dests(board, dests)
    return dests


def position(board, with_moves=False):
    result = {
        "fen": board.board_fen(),
        "turn": color_name(board.turn),
        "check": board.is_check(),
    }
    if with_moves:
        # For puzzles: the legal moves, so only those can be played on the board,
        # and every mating move, so any checkmate counts as a correct answer.
        mates = {}
        for move in board.legal_moves:
            board.push(move)
            if board.is_checkmate():
                key = chess.square_name(move.from_square) + chess.square_name(move.to_square)
                mates.setdefault(key, board.board_fen())
            board.pop()
        result["dests"] = legal_dests(board)
        result["mates"] = mates
    return result


def load_chapter(game, title, with_moves=False, orientation=None):
    """One game as a starting position plus a step for every main-line move.

    ``orientation`` is used when the game has no [Orientation] header; None means
    the side to move at the start.
    """
    board = game.board()
    header_orientation = (header(game, "Orientation") or "").lower()
    if header_orientation in ("white", "black"):
        orientation = header_orientation
    elif orientation is None:
        orientation = color_name(board.turn)
    chapter = {
        "title": title,
        "orientation": orientation,
        "intro": clean_comment(game.comment),
        "shapes": shapes(game),
        **position(board, with_moves),
        "steps": [],
    }
    for node in game.mainline():
        move = node.move
        number_prefix = f"{board.fullmove_number}." if board.turn == chess.WHITE else f"{board.fullmove_number}..."
        san = board.san(move)
        board.push(move)
        chapter["steps"].append({
            "number": number_prefix,
            "san": san,
            "from": chess.square_name(move.from_square),
            "to": chess.square_name(move.to_square),
            "comment": clean_comment(node.comment),
            "shapes": shapes(node),
            **position(board, with_moves),
        })
    return chapter


def read_games(path):
    """All games in a PGN file. Raises LessonError if any of them is broken."""
    games = []
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        while True:
            game = chess.pgn.read_game(f)
            if game is None:
                break
            if game.errors:
                raise LessonError(f"Game {len(games) + 1}: {game.errors[0]}")
            games.append(game)
    if not games:
        raise LessonError("No games found in the file.")
    return games


def game_title(game):
    # A lichess chapter export names the chapter in ChapterName; Event then
    # holds "Study: Chapter".
    return header(game, "ChapterName") or header(game, "Event")


def load_lesson(path, lesson_id):
    """A lesson file: one lesson, with each game as a chapter."""
    games = read_games(path)
    if len(games) == 1:
        title = game_title(games[0])
    else:
        # A whole exported study: the study is the lesson, games are chapters.
        title = header(games[0], "StudyName")
    chapters = [
        load_chapter(game, game_title(game) or f"Example {i}", orientation="white")
        for i, game in enumerate(games, start=1)
    ]
    return [{"id": lesson_id, "title": title or display_name(path.stem), "chapters": chapters}]


def load_puzzles(path, file_id):
    """A puzzle file: every game is a separate puzzle."""
    games = read_games(path)
    puzzles = []
    for i, game in enumerate(games, start=1):
        single = len(games) == 1
        title = game_title(game) or (display_name(path.stem) if single else f"{display_name(path.stem)} {i}")
        puzzle = load_chapter(game, title, with_moves=True)
        if not puzzle["steps"]:
            raise LessonError(f"Game {i} has no solution moves.")
        if not puzzle["intro"]:
            puzzle["intro"] = f"{puzzle['turn'].capitalize()} to move."
        puzzle["id"] = file_id if single else f"{file_id}/{i}"
        puzzles.append(puzzle)
    return puzzles


def load_folder(root, load_file):
    """Read every .pgn file under ``root`` with ``load_file(path, id)``.

    Returns ``{"categories": [{"name", "items"}], "errors": [{"file", "message"}]}``,
    where items are what ``load_file`` returns, in file-name order. A broken file
    is reported in ``errors`` and skipped; it never stops the others loading.
    """
    root = Path(root)
    categories = {}  # folder name (None for files at the top level) -> items
    errors = []
    for path in sorted(root.rglob("*.pgn")):
        rel = path.relative_to(root)
        folder = rel.parts[0] if len(rel.parts) > 1 else None
        try:
            items = load_file(path, rel.with_suffix("").as_posix())
        except (LessonError, OSError, ValueError) as e:
            errors.append({"file": rel.as_posix(), "message": str(e)})
            continue
        categories.setdefault(folder, []).extend(items)

    ordered = sorted(f for f in categories if f is not None)
    if None in categories:
        ordered.append(None)
    return {
        "categories": [
            {"name": display_name(f) if f else UNCATEGORIZED, "items": categories[f]}
            for f in ordered
        ],
        "errors": errors,
    }


def load_lesson_library(root):
    return load_folder(root, load_lesson)


def load_puzzle_library(root):
    return load_folder(root, load_puzzles)
