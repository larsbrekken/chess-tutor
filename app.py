"""Chess Tutor: a web app for teaching chess concepts to a class.

Run locally with `python app.py`; it opens the app in your default browser.
On Render, gunicorn runs `app` directly (see render.yaml).
"""

import threading
import webbrowser
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from library import editor_dests, load_lesson_library, load_puzzle_library

HOST = "127.0.0.1"
PORT = 8765
LESSONS_DIR = Path(__file__).parent / "lessons"
PUZZLES_DIR = Path(__file__).parent / "puzzles"
# Linked from every page. The app is GPL-3.0 (like the chessground board it
# uses), so visitors must be able to get the source.
SOURCE_URL = "https://github.com/larsbrekken/chess-tutor"

app = Flask(__name__)


@app.context_processor
def template_globals():
    return {"source_url": SOURCE_URL}


@app.route("/")
def lessons_page():
    return render_template("lessons.html", page="lessons")


@app.route("/puzzles")
def puzzles_page():
    return render_template("puzzles.html", page="puzzles")


@app.route("/editor")
def editor_page():
    return render_template("editor.html", page="editor")


@app.route("/api/lessons")
def lessons_api():
    # Read from disk on every request so new files show up on refresh.
    return jsonify(load_lesson_library(LESSONS_DIR))


@app.route("/api/puzzles")
def puzzles_api():
    return jsonify(load_puzzle_library(PUZZLES_DIR))


@app.route("/api/legal-moves")
def legal_moves_api():
    """Legal moves for the board editor: ?fen=<piece placement>."""
    try:
        return jsonify(editor_dests(request.args.get("fen", "")))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    url = f"http://{HOST}:{PORT}/"
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    app.run(host=HOST, port=PORT)
