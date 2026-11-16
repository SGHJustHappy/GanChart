"""Optional local preview server: python serve.py [--port 8765] [--no-browser]."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import webbrowser


def main():
    parser = argparse.ArgumentParser(description="Open Flow Gantt on localhost")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError as exc:
        parser.exit(1, f"Cannot start local server: {exc}\nTry --port 8766.\n")
    url = f"http://127.0.0.1:{args.port}/"
    print(f"Flow Gantt: {url}\nPress Ctrl+C to stop.")
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
