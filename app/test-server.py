#!/usr/bin/env python3
"""
Development server with API proxy for testing
Serves local files and proxies API requests to avoid CORS issues

Uses asyncio for true concurrent request handling, preventing
slow API requests from blocking other requests.
"""

import asyncio
import aiohttp
from aiohttp import web
import os
from pathlib import Path
import mimetypes

PORT = 9000
PROXY_HOST = "https://iwalton.com"

# Paths to proxy to remote server (everything else served locally)
PROXY_PATHS = [
    '/spa-api',
    '/spwg-api',
    '/theme/',
]

# Base directory for serving files
BASE_DIR = Path(__file__).parent.resolve()


async def proxy_request(request):
    """
    Proxy API requests to the remote server.
    Handles both GET and POST requests asynchronously.
    """
    target_url = PROXY_HOST + request.path_qs
    method = request.method

    print(f"[PROXY] {method} {request.path_qs} -> {target_url}")

    # Prepare headers
    headers = {
        'User-Agent': request.headers.get('User-Agent', 'Mozilla/5.0'),
        'Content-Type': request.headers.get('Content-Type', 'application/json'),
    }

    # Copy cookies if present
    if 'Cookie' in request.headers:
        headers['Cookie'] = request.headers['Cookie']

    # Read request body for POST
    body = None
    if method == 'POST':
        body = await request.read()

    try:
        # Create a session with connection pooling for efficiency
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method,
                target_url,
                headers=headers,
                data=body,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                # Prepare response headers
                response_headers = {}
                for header, value in response.headers.items():
                    # Skip some headers
                    if header.lower() not in ['transfer-encoding', 'connection', 'content-encoding']:
                        # Strip Secure flag from Set-Cookie for localhost development
                        if header.lower() == 'set-cookie':
                            value = value.replace('; Secure', '').replace(';Secure', '')
                        response_headers[header] = value

                # Add CORS headers
                response_headers['Access-Control-Allow-Origin'] = '*'
                response_headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
                response_headers['Access-Control-Allow-Headers'] = 'Content-Type'

                # Read response body
                body = await response.read()

                return web.Response(
                    body=body,
                    status=response.status,
                    headers=response_headers
                )

    except asyncio.TimeoutError:
        print(f"[PROXY ERROR] Timeout for {target_url}")
        return web.Response(text="Proxy timeout", status=504)
    except aiohttp.ClientError as e:
        print(f"[PROXY ERROR] {type(e).__name__}: {e}")
        return web.Response(text=f"Proxy error: {e}", status=502)
    except Exception as e:
        print(f"[PROXY ERROR] {type(e).__name__}: {e}")
        return web.Response(text=f"Server error: {e}", status=500)


async def serve_file(request):
    """
    Serve static files from the local filesystem.
    Handles SPA routing by serving index.html for routes without extensions.
    """
    path = request.path.lstrip('/')

    # Default to index.html
    if not path:
        path = 'index.html'

    # SPA routing: if no extension and not a directory, serve index.html
    file_path = BASE_DIR / path
    if not file_path.suffix and not file_path.is_dir():
        path = 'index.html'
        file_path = BASE_DIR / 'index.html'

    # If it's a directory, try index.html
    if file_path.is_dir():
        file_path = file_path / 'index.html'

    # Security: ensure the path is within BASE_DIR
    try:
        file_path = file_path.resolve()
        file_path.relative_to(BASE_DIR)
    except (ValueError, RuntimeError):
        return web.Response(text="Forbidden", status=403)

    # Check if file exists
    if not file_path.exists() or not file_path.is_file():
        return web.Response(text="Not Found", status=404)

    # Determine content type
    content_type, _ = mimetypes.guess_type(str(file_path))
    if not content_type:
        content_type = 'application/octet-stream'

    # Determine charset for text files
    charset = None
    if content_type.startswith('text/') or content_type == 'application/javascript':
        charset = 'utf-8'

    print(f"[LOCAL] {request.method} {request.path} -> {file_path.relative_to(BASE_DIR)}")

    # Read and return file (use async I/O to avoid blocking)
    try:
        # Read file in executor to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        content = await loop.run_in_executor(None, lambda: file_path.read_bytes())
        return web.Response(body=content, content_type=content_type, charset=charset)
    except Exception as e:
        print(f"[ERROR] Failed to read {file_path}: {e}")
        return web.Response(text="Internal Server Error", status=500)


async def handle_options(request):
    """Handle OPTIONS requests for CORS preflight"""
    return web.Response(
        headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    )


async def handle_request(request):
    """Main request handler - routes to proxy or file server"""
    # Handle OPTIONS for CORS
    if request.method == 'OPTIONS':
        return await handle_options(request)

    # Proxy API requests (check if path starts with any configured proxy path)
    if any(request.path.startswith(path) for path in PROXY_PATHS):
        return await proxy_request(request)

    # Serve local files
    return await serve_file(request)


def run_server():
    """Start the async development server"""
    app = web.Application()

    # Single catch-all route that handles everything
    app.router.add_route('*', '/{path:.*}', handle_request)

    print("=" * 60)
    print(f"🚀 Development Server Running (Async)")
    print("=" * 60)
    print(f"Local files:  http://localhost:{PORT}/")
    print(f"API proxy:")
    for path in PROXY_PATHS:
        print(f"              {path}* -> {PROXY_HOST}{path}*")
    print("=" * 60)
    print(f"✨ Fully concurrent - handles unlimited parallel requests")
    print("=" * 60)
    print("Press Ctrl+C to stop")
    print()

    web.run_app(app, host='0.0.0.0', port=PORT, print=lambda x: None)


if __name__ == "__main__":
    run_server()
