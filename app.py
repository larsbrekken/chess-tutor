"""Chess Tutor: a local web app for teaching chess concepts to a class.

Run with `python app.py`; it opens the app in your default browser.
"""

import threading
import webbrowser
from pathlib import Path

from flask import Flask, jsonify, render_template

from lessons import load_library

HOST = "127.0.0.1"
PORT = 8765
LESSONS_DIR = Path(__file__).parent / "lessons"

app = Flask(__name__)


@app.route("/")
def lessons_page():
    return render_template("lessons.html", page="lessons")


@app.route("/editor")
def editor_page():
    return render_template("editor.html", page="editor")


@app.route("/api/lessons")
def lessons_api():
    # Read from disk on every request so new lesson files show up on refresh.
    return jsonify(load_library(LESSONS_DIR))


if __name__ == "__main__":
    url = f"http://{HOST}:{PORT}/"
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    app.run(host=HOST, port=PORT)
