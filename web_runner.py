#!/usr/bin/env python3
"""
Simple local web runner for the project.

Usage:
  python3 web_runner.py [--port PORT]

Starts a simple HTTP server serving the current directory and opens
http://localhost:PORT in the default web browser.
"""
import http.server
import socketserver
import webbrowser
import argparse
import os

parser = argparse.ArgumentParser(description='Start a simple HTTP server and open the browser')
parser.add_argument('--port', type=int, default=8000, help='Port to listen on')
args = parser.parse_args()

PORT = args.port
Handler = http.server.SimpleHTTPRequestHandler

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    url = f'http://localhost:{PORT}/index.html'
    print(f"Serving HTTP on port {PORT} (http://localhost:{PORT}/) ...")
    try:
        webbrowser.open(url)
    except Exception:
        print(f"Open your browser and navigate to {url}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down server')
        httpd.server_close()
