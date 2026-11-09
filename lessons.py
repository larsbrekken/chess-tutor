"""Load teaching lessons from PGN files.

Each .pgn file in the lessons folder is one lesson. A subfolder groups lessons
into a category (``lessons/checkmates/queen-and-rook.pgn`` is in "Checkmates").
A file may hold several games; each one becomes a chapter of the lesson.

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


def position(board):
    return {
        "fen": board.board_fen(),
        "turn": "white" if board.turn == chess.WHITE else "black",
        "check": board.is_check(),
    }


def load_chapter(game, number):
    board = game.board()
    chapter = {
        "title": header(game, "ChapterName") or header(game, "Event") or f"Example {number}",
        "orientation": "black" if (header(game, "Orientation") or "").lower() == "black" else "white",
        "intro": clean_comment(game.comment),
        "shapes": shapes(game),
        **position(board),
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
            **position(board),
        })
    return chapter


def load_lesson(path, lesson_id):
    games = []
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        while True:
            game = chess.pgn.read_game(f)
            if game is None:
                break
            if game.errors:
                raise LessonError(f"Example {len(games) + 1}: {game.errors[0]}")
            games.append(game)
    if not games:
        raise LessonError("No games found in the file.")

    if len(games) == 1:
        # A single exported lichess chapter has the study's name in StudyName
        # and its own name in ChapterName; the chapter name is the lesson.
        title = header(games[0], "ChapterName") or header(games[0], "Event")
    else:
        # A whole exported study: the study is the lesson, games are chapters.
        title = header(games[0], "StudyName")
    return {
        "id": lesson_id,
        "title": title or display_name(path.stem),
        "chapters": [load_chapter(game, i) for i, game in enumerate(games, start=1)],
    }


def load_library(root):
    """Read every lesson under ``root``.

    Returns ``{"categories": [{"name", "lessons"}], "errors": [{"file", "message"}]}``.
    A broken file is reported in ``errors`` and skipped; it never stops the others loading.
    """
    root = Path(root)
    categories = {}  # folder name -> list of lessons
    errors = []
    for path in sorted(root.rglob("*.pgn")):
        rel = path.relative_to(root)
        folder = rel.parts[0] if len(rel.parts) > 1 else None
        try:
            lesson = load_lesson(path, rel.with_suffix("").as_posix())
        except (LessonError, OSError, ValueError) as e:
            errors.append({"file": rel.as_posix(), "message": str(e)})
            continue
        categories.setdefault(folder, []).append(lesson)

    ordered = sorted((f for f in categories if f is not None))
    if None in categories:
        ordered.append(None)
    return {
        "categories": [
            {"name": display_name(f) if f else UNCATEGORIZED, "lessons": categories[f]}
            for f in ordered
        ],
        "errors": errors,
    }
