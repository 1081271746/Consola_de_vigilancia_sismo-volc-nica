from http.server import SimpleHTTPRequestHandler, HTTPServer


class Handler(SimpleHTTPRequestHandler):

    def end_headers(self):

        self.send_header(
            "Cross-Origin-Opener-Policy",
            "same-origin"
        )

        self.send_header(
            "Cross-Origin-Embedder-Policy",
            "require-corp"
        )

        super().end_headers()


server = HTTPServer(
    ("localhost", 8000),
    Handler
)

print(
    "Servidor iniciado en http://localhost:8000"
)

server.serve_forever()