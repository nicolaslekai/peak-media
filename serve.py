#!/usr/bin/env python3
"""Static server with HTTP Range support — required for <video> scroll-scrubbing (seeking).
Python's stock http.server ignores Range, so browsers can't seek. This adds it.
Usage: python serve.py [port]
"""
import os, sys, re, http.server, socketserver

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173

class RangeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        rng = self.headers.get("Range")
        if not rng:
            return super().send_head()
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()
        try:
            size = os.path.getsize(path)
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            start = int(m.group(1)) if m.group(1) else 0
            end = int(m.group(2)) if m.group(2) else size - 1
            end = min(end, size - 1)
            if start > end:
                self.send_error(416); return None
            length = end - start + 1
            ctype = self.guess_type(path)
            f = open(path, "rb"); f.seek(start)
            self.send_response(206)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(length))
            self.end_headers()
            # stream just the requested slice
            remaining = length
            while remaining > 0:
                chunk = f.read(min(64 * 1024, remaining))
                if not chunk: break
                try: self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError): break
                remaining -= len(chunk)
            f.close()
            return None
        except Exception:
            return super().send_head()

    def log_message(self, *a):
        pass

class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == "__main__":
    with ThreadingServer(("127.0.0.1", PORT), RangeHandler) as httpd:
        print(f"Range-capable server on http://127.0.0.1:{PORT}  (root: {ROOT})")
        httpd.serve_forever()
