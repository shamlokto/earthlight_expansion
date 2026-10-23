#!/usr/bin/env python3
"""Local dev server for the Earth Light lab (ES modules need http://, not file://).

    python3 serve.py [--port 8765] [--rom ROM] [--patch PATCH]

--rom / --patch are only for automated testing: they expose the files at
/__test_rom and /__test_patch on localhost. Normal use is to pick them in the page.
"""
import argparse, functools, http.server, os

ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8765)
ap.add_argument('--rom')
ap.add_argument('--patch')
args = ap.parse_args()
root = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        src = {'/__test_rom': args.rom, '/__test_patch': args.patch}.get(self.path)
        if src:
            data = open(src, 'rb').read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


http.server.ThreadingHTTPServer(('127.0.0.1', args.port),
                                functools.partial(Handler, directory=root)).serve_forever()
