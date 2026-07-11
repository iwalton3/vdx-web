# Development Server with API Proxy

## Quick Start

```bash
cd app
python3 test-server.py
```

Then open: **http://localhost:9000/**

## What It Does

The `test-server.py` script provides:

1. **Local file serving** - Serves your app files from the `app/` directory
2. **API proxy** - Proxies API requests to avoid CORS issues:
   - `/spa-api/*` → `https://iwalton.com/spa-api/*`
   - `/spwg-api/*` → `https://iwalton.com/spwg-api/*`

## Why Use This?

When developing locally, browsers block requests to external APIs due to CORS (Cross-Origin Resource Sharing) restrictions. This development server:

✅ Serves your local files
✅ Proxies API requests through the same origin
✅ Adds CORS headers automatically
✅ Shows helpful logging for debugging

## Example Output

```
============================================================
🚀 Development Server Running
============================================================
Local files:  http://localhost:9000/
API proxy:    /spa-api/* -> https://iwalton.com/spa-api/*
              /spwg-api/* -> https://iwalton.com/spwg-api/*
============================================================
Press Ctrl+C to stop

[LOCAL] GET / HTTP/1.1 200 -
[LOCAL] GET /styles/global.css HTTP/1.1 200 -
[LOCAL] GET /app.js HTTP/1.1 200 -
[PROXY] POST /spwg-api/ -> https://iwalton.com/spwg-api/
```

## API Configuration

The API files (`spwg_api.js`) have been configured to use relative URLs:

```javascript
// Before (direct, causes CORS issues):
const url = "https://iwalton.com/spwg-api/";

// After (uses proxy):
const url = "/spwg-api/";
```

The development server automatically proxies these requests to the real API.

## Stopping the Server

Press **Ctrl+C** in the terminal running the server.

Or kill it manually:
```bash
pkill -f test-server.py
```

## For Production

In production, you would:
1. Deploy files to actual server
2. Update API URLs back to absolute paths
3. Or configure your production server to proxy API requests
