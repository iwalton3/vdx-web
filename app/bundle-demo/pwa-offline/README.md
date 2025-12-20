# PWA Offline Demo - Versioned Service Worker Caching

This demo shows how to use `spider-deps.js` and the service worker to create a fully offline-capable PWA with version-safe caching.

## Why This Approach?

Traditional bundlers (webpack, vite, etc.) solve the "cache coherency" problem by:
1. Bundling all JS into one file
2. Adding content hashes to filenames

Service workers provide the same cache coherency guarantees, but without modifying your source files. The approach is less obtrusive, all you have to do is regenerate the manifest and all your code splitting and dynamic imports work as-is with no filename mangling. You also get the benefit of offline caching for your application with minimal effort.

## How It Works

### 1. Dependency Discovery (`spider-deps.js`)

The spider parses your entry HTML file, follows all `<script>` and `import` statements, and discovers every dependency:

```
index.html
  ├── styles.css
  ├── demo-app.js
  │   └── ../../lib/framework.js
  │       └── ./core/component.js
  │       └── ./core/template.js
  │       └── ...
  └── manifest.json
```

### 2. Version Hash

All discovered files are hashed together to create a single version string:

```json
{
    "version": "a1b2c3d4",
    "files": ["/index.html", "/demo-app.js", ...]
}
```

**Any file change = new version hash**

This ensures you never load mismatched file versions.

### 3. Versioned Caching

The service worker creates a separate cache for each version:

```
app-static-va1b2c3d4/    ← Current version
app-static-v98765432/    ← Previous version (deleted after update)
```

### 4. Atomic Updates

1. New version detected
2. **New cache created and fully populated**
3. Old cache deleted
4. User notified to reload

No partial/mixed versions are ever served.

## Usage

### 1. Run the Spider

Before deploying, generate the cache manifest:

```bash
cd app/bundle-demo/pwa-offline
node spider-deps.js
```

Output:
```
Spidering dependencies...

Discovered 12 files
Content hash: a1b2c3d4
Manifest written to: cache-manifest.json

Files by type:
  .js: 8
  .css: 2
  .html: 1
  .json: 1
```

### 2. Deploy

Deploy the entire directory including `cache-manifest.json` and `sw.js`.

### 3. Test Offline

1. Open the app in browser
2. Open DevTools → Network
3. Check "Offline"
4. Reload - app still works!

## Configuration

### spider-deps.js

Edit the `CONFIG` object at the top:

```javascript
const CONFIG = {
    entryPoint: 'index.html',      // Start file
    outputFile: 'cache-manifest.json',
    alwaysInclude: ['manifest.json'],
    vendorDirs: ['vendor/some-lib'], // Include entire directories
    cacheableExtensions: new Set(['.js', '.css', ...])
};
```

### sw.js

Edit the `CONFIG` object:

```javascript
const CONFIG = {
    cachePrefix: 'app-static-v',    // Cache name prefix
    manifestUrl: './cache-manifest.json',
    skipPaths: ['/api/'],           // Don't cache API calls
    indexPage: '/index.html',       // Fallback for navigation
    strictVersionMode: false        // See below
};
```

### Strict Version Mode

By default (`strictVersionMode: false`), the service worker uses cache-first for instant loads. Updates are detected in the background and may require a second refresh to take effect.

Set `strictVersionMode: true` for webpack-like behavior:
- Checks manifest on every page navigation before serving cached files
- Guarantees newest version on a single reload
- Adds network latency on each page load (manifest fetch)
- Falls back to cache if offline

```javascript
// Webpack-like update behavior (single refresh for new version)
strictVersionMode: true

// Instant loads, but may need refresh twice for updates
strictVersionMode: false
```

## Client Communication

The service worker sends messages to the page:

### cache-status
```javascript
{
    type: 'cache-status',
    status: 'ready' | 'caching' | 'offline' | 'error',
    version: 'a1b2c3d4',
    progress: { current: 5, total: 12 }  // During caching
}
```

### update-available
```javascript
{
    type: 'update-available',
    version: 'b2c3d4e5',
    previousVersion: 'a1b2c3d4'
}
```

### Example: Listen for Updates

```javascript
navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'update-available') {
        showUpdateBanner(event.data.version);
    }
});
```

### Example: Request Status

```javascript
const reg = await navigator.serviceWorker.ready;
reg.active.postMessage({ type: 'check-cache' });
```

## Commands

Send these commands to the service worker:

| Command | Description |
|---------|-------------|
| `check-cache` | Get current cache status |
| `update-cache` | Check for and apply updates |
| `clear-cache` | Delete all cached files |
| `debug-cache` | Dump cache contents |

## Deployment Flow

```bash
#!/bin/bash
# Example deploy script

# 1. Generate manifest with new version hash
cd app/bundle-demo/pwa-offline
node spider-deps.js

# 2. Deploy to server
rsync -av . server:/var/www/app/

# 3. Users will see "Update Available" on next visit
```

## Version Matching Guarantees

1. **Atomic caching** - All files cached before activation
2. **Integrity verification** - Incomplete cache detected and re-cached
3. **Isolated versions** - Each version has its own cache
4. **No race conditions** - Old cache available during update
5. **Deterministic hashing** - Same files = same version

## Browser Support

- Chrome/Edge 40+
- Firefox 44+
- Safari 11.1+
- iOS Safari 11.3+

## Files

```
pwa-offline/
├── README.md           # This file
├── spider-deps.js      # Dependency discovery tool
├── sw.js               # Service worker
├── cache-manifest.json # Generated by spider-deps
├── index.html          # Demo page
├── styles.css          # Demo styles
├── demo-app.js         # Demo VDX component
└── manifest.json       # PWA manifest
```
