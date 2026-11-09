"""Chess Tutor: a local web app for teaching chess concepts to a class.

Run with `python app.py`; it opens the board in your default browser.
"""

import threading
import webbrowser

from flask import Flask, render_template

HOST = "127.0.0.1"
PORT = 8765

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    url = f"http://{HOST}:{PORT}/"
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    app.run(host=HOST, port=PORT)
