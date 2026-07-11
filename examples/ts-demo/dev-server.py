#!/usr/bin/env python3
"""
VDX TypeScript Demo Dev Server

Features:
- Serves files at http://localhost:9001/
- Watches .ts files and compiles on change
- Displays TypeScript errors in terminal
- Hot reload friendly (refresh browser to see changes)

Usage:
    python3 dev-server.py

Requirements:
    - Python 3.7+
    - TypeScript installed globally or locally: npm install -g typescript
"""

import http.server
import socketserver
import os
import sys
import subprocess
import threading
import time
from pathlib import Path
from datetime import datetime

# Configuration
PORT = 9001
WATCH_EXTENSIONS = {'.ts'}
IGNORE_PATTERNS = {'node_modules', '.git', '__pycache__'}

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def log(message, color=Colors.END):
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"{Colors.CYAN}[{timestamp}]{Colors.END} {color}{message}{Colors.END}")

def compile_typescript():
    """Run TypeScript compiler"""
    log("Compiling TypeScript...", Colors.YELLOW)

    try:
        result = subprocess.run(
            ['npx', 'tsc', '--project', 'tsconfig.json'],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )

        if result.returncode == 0:
            log("TypeScript compiled successfully!", Colors.GREEN)
            return True
        else:
            log("TypeScript compilation errors:", Colors.RED)
            print(result.stdout)
            if result.stderr:
                print(result.stderr)
            return False

    except FileNotFoundError:
        log("Error: TypeScript compiler not found. Install with: npm install -g typescript", Colors.RED)
        return False
    except Exception as e:
        log(f"Error running tsc: {e}", Colors.RED)
        return False

class FileWatcher:
    """Watch for file changes and trigger recompilation"""

    def __init__(self, directory, callback):
        self.directory = Path(directory)
        self.callback = callback
        self.file_times = {}
        self.running = False

    def get_watched_files(self):
        """Get all TypeScript files recursively"""
        files = {}
        for ext in WATCH_EXTENSIONS:
            for file_path in self.directory.rglob(f'*{ext}'):
                # Skip ignored patterns
                if any(pattern in str(file_path) for pattern in IGNORE_PATTERNS):
                    continue
                try:
                    files[file_path] = file_path.stat().st_mtime
                except OSError:
                    pass
        return files

    def check_changes(self):
        """Check for file changes"""
        current_files = self.get_watched_files()
        changed = False

        # Check for new or modified files
        for file_path, mtime in current_files.items():
            if file_path not in self.file_times:
                log(f"New file: {file_path.name}", Colors.BLUE)
                changed = True
            elif self.file_times[file_path] != mtime:
                log(f"Changed: {file_path.name}", Colors.BLUE)
                changed = True

        # Check for deleted files
        for file_path in list(self.file_times.keys()):
            if file_path not in current_files:
                log(f"Deleted: {file_path.name}", Colors.BLUE)
                changed = True

        self.file_times = current_files
        return changed

    def start(self):
        """Start watching for changes"""
        self.running = True
        self.file_times = self.get_watched_files()

        def watch_loop():
            while self.running:
                time.sleep(1)  # Check every second
                if self.check_changes():
                    self.callback()

        thread = threading.Thread(target=watch_loop, daemon=True)
        thread.start()
        log(f"Watching {len(self.file_times)} TypeScript files for changes", Colors.CYAN)

    def stop(self):
        """Stop watching"""
        self.running = False

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler with better defaults"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

    def log_message(self, format, *args):
        # Only log actual requests, not every file
        if '/lib/' not in args[0] and '/stores/' not in args[0]:
            log(f"GET {args[0]}", Colors.END)

    def end_headers(self):
        # Add CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def guess_type(self, path):
        # Ensure .js files are served with correct MIME type
        if path.endswith('.js'):
            return 'application/javascript'
        return super().guess_type(path)

def main():
    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    print()
    print(f"{Colors.BOLD}{Colors.HEADER}VDX TypeScript Demo Dev Server{Colors.END}")
    print(f"{Colors.CYAN}================================{Colors.END}")
    print()

    # Initial compilation
    if not compile_typescript():
        log("Initial compilation had errors, but server will still start", Colors.YELLOW)

    # Start file watcher
    watcher = FileWatcher('.', compile_typescript)
    watcher.start()

    # Start HTTP server
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        log(f"Server running at http://localhost:{PORT}/", Colors.GREEN)
        log("Press Ctrl+C to stop", Colors.CYAN)
        print()

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print()
            log("Shutting down...", Colors.YELLOW)
            watcher.stop()
            httpd.shutdown()

if __name__ == '__main__':
    main()
