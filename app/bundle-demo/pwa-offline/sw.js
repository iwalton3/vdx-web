/**
 * sw.js - Generic Service Worker for PWA Offline Caching
 *
 * Provides versioned offline caching using cache-manifest.json generated
 * by spider-deps.js. Prevents loading mismatched file versions.
 *
 * Features:
 * - Versioned caches: Each manifest version gets its own cache
 * - Atomic updates: New cache fully populated before activation
 * - Version integrity: Content hash ensures all files match
 * - Progress reporting: Clients notified of caching progress
 * - Automatic cleanup: Old caches deleted after update
 *
 * Cache Strategy:
 * - Cache-first for static assets (fast offline loads)
 * - Network fallback with opportunistic caching
 * - Navigation requests fall back to cached index.html
 */

// =============================================================================
// Configuration - Modify for your project
// =============================================================================

const CONFIG = {
    // Cache name prefix (version will be appended)
    cachePrefix: 'app-static-v',

    // Path to cache manifest (relative to service worker)
    manifestUrl: './cache-manifest.json',

    // Paths to skip caching (let app handle these)
    skipPaths: [
        '/api/'  // Skip API calls
    ],

    // Index page for navigation fallback
    indexPage: '/bundle-demo/pwa-offline/index.html',

    // Strict version mode: Always check manifest before serving cached files.
    // - true: Ensures newest version on single reload (like webpack), but adds
    //         latency on each page load while manifest is fetched.
    // - false: Cache-first for instant loads, but may need refresh twice to
    //          get new version.
    strictVersionMode: false
};

// =============================================================================
// Service Worker State
// =============================================================================

let currentCacheName = null;
let currentVersion = null;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Fetch and parse the cache manifest
 * Uses cache-busting to ensure fresh manifest
 */
async function fetchManifest() {
    try {
        const cacheBuster = `?_=${Date.now()}`;
        const response = await fetch(CONFIG.manifestUrl + cacheBuster, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Manifest fetch failed: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('[SW] Failed to fetch manifest:', error);
        return null;
    }
}

/**
 * Find the current active cache and its version
 */
async function findCurrentCache() {
    const cacheNames = await caches.keys();
    const appCaches = cacheNames.filter(name => name.startsWith(CONFIG.cachePrefix));

    for (const cacheName of appCaches) {
        try {
            const cache = await caches.open(cacheName);
            const response = await cache.match(CONFIG.manifestUrl);
            if (response) {
                const manifest = await response.json();
                return { cacheName, version: manifest.version };
            }
        } catch (error) {
            // Cache exists but manifest is missing/corrupt
        }
    }
    return { cacheName: null, version: null };
}

/**
 * Post a message to all connected clients
 */
async function postMessageToClients(message) {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
        client.postMessage(message);
    }
}

/**
 * Cache all files from manifest into a new versioned cache
 */
async function cacheManifestFiles(manifest) {
    const newCacheName = CONFIG.cachePrefix + manifest.version;
    const cache = await caches.open(newCacheName);
    const total = manifest.files.length;
    let current = 0;

    console.log(`[SW] Caching ${total} files for version ${manifest.version}`);

    // Notify clients that caching has started
    await postMessageToClients({
        type: 'cache-status',
        status: 'caching',
        progress: { current: 0, total },
        version: manifest.version
    });

    // Cache files in batches to avoid overwhelming network
    const batchSize = 5;
    const errors = [];

    for (let i = 0; i < manifest.files.length; i += batchSize) {
        const batch = manifest.files.slice(i, i + batchSize);

        await Promise.all(batch.map(async (file) => {
            try {
                const cacheBuster = `?_=${Date.now()}`;
                const response = await fetch(file + cacheBuster, { cache: 'no-store' });
                if (response.ok) {
                    // Store with original path for proper matching
                    await cache.put(file, response.clone());
                    // Also store with full URL
                    const fullUrl = new URL(file, self.location.href).href;
                    await cache.put(fullUrl, response.clone());
                } else {
                    errors.push({ file, status: response.status });
                }
            } catch (error) {
                errors.push({ file, error: error.message });
            }
            current++;
        }));

        // Update progress
        await postMessageToClients({
            type: 'cache-status',
            status: 'caching',
            progress: { current, total },
            version: manifest.version
        });
    }

    // Cache the manifest itself (critical for version detection)
    try {
        const cacheBuster = `?_=${Date.now()}`;
        const manifestResponse = await fetch(CONFIG.manifestUrl + cacheBuster, { cache: 'no-store' });
        if (manifestResponse.ok) {
            await cache.put(CONFIG.manifestUrl, manifestResponse);
        }
    } catch (error) {
        console.error('[SW] Failed to cache manifest:', error);
        errors.push({ file: CONFIG.manifestUrl, error: error.message });
    }

    if (errors.length > 0) {
        console.warn('[SW] Some files failed to cache:', errors);
        // Delete incomplete cache
        await caches.delete(newCacheName);
        await postMessageToClients({
            type: 'cache-status',
            status: 'error',
            version: manifest.version,
            errors
        });
        return null;
    }

    console.log(`[SW] Successfully cached version ${manifest.version}`);
    return newCacheName;
}

/**
 * Verify cache integrity - all manifest files present
 */
async function verifyCacheIntegrity(cacheName, manifest) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const cachedUrls = new Set(keys.map(req => new URL(req.url).pathname));

    let missingCount = 0;
    for (const file of manifest.files) {
        if (!cachedUrls.has(file)) {
            missingCount++;
        }
    }

    return missingCount === 0;
}

/**
 * Clean up old versioned caches
 */
async function cleanupOldCaches(keepCacheName) {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name =>
        name.startsWith(CONFIG.cachePrefix) && name !== keepCacheName
    );

    for (const cacheName of oldCaches) {
        console.log(`[SW] Deleting old cache: ${cacheName}`);
        await caches.delete(cacheName);
    }
}

/**
 * Check if cache needs updating and update if necessary
 */
async function updateCacheIfNeeded() {
    const manifest = await fetchManifest();
    if (!manifest) {
        // Manifest fetch failed - check if we have a cached version (offline mode)
        const { cacheName, version } = await findCurrentCache();
        if (cacheName) {
            currentCacheName = cacheName;
            currentVersion = version;
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            await postMessageToClients({
                type: 'cache-status',
                status: 'offline',
                version: version,
                fileCount: keys.length
            });
            return false;
        }
        // No cache and can't fetch manifest - actual error
        await postMessageToClients({
            type: 'cache-status',
            status: 'error',
            error: 'Failed to fetch manifest'
        });
        return false;
    }

    const { cacheName: existingCacheName, version: existingVersion } = await findCurrentCache();

    // If versions match, verify integrity
    if (existingVersion === manifest.version && existingCacheName) {
        const isComplete = await verifyCacheIntegrity(existingCacheName, manifest);
        if (isComplete) {
            currentCacheName = existingCacheName;
            currentVersion = existingVersion;
            await postMessageToClients({
                type: 'cache-status',
                status: 'ready',
                version: existingVersion
            });
            return false;
        }
        // Cache incomplete - delete and re-cache
        console.log(`[SW] Cache incomplete for version ${existingVersion}, re-caching...`);
        await caches.delete(existingCacheName);
    }

    // Cache new version
    const newCacheName = await cacheManifestFiles(manifest);

    if (newCacheName) {
        const hadPreviousVersion = existingVersion && existingVersion !== manifest.version;
        currentCacheName = newCacheName;
        currentVersion = manifest.version;

        await cleanupOldCaches(newCacheName);

        await postMessageToClients({
            type: 'cache-status',
            status: 'ready',
            version: manifest.version,
            updated: hadPreviousVersion,
            previousVersion: hadPreviousVersion ? existingVersion : undefined
        });

        if (hadPreviousVersion) {
            await postMessageToClients({
                type: 'update-available',
                version: manifest.version,
                previousVersion: existingVersion
            });
        }

        return hadPreviousVersion;
    }

    return false;
}

// =============================================================================
// Service Worker Lifecycle Events
// =============================================================================

/**
 * Install event - precache all files before activating
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        (async () => {
            await updateCacheIfNeeded();
            // Skip waiting - safe because we use versioned caches
            self.skipWaiting();
            console.log('[SW] Install complete');
        })()
    );
});

/**
 * Activate event - claim clients and clean up
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        (async () => {
            if (!currentCacheName) {
                const { cacheName, version } = await findCurrentCache();
                currentCacheName = cacheName;
                currentVersion = version;
            }

            if (currentCacheName) {
                await cleanupOldCaches(currentCacheName);
            }

            await self.clients.claim();
            console.log('[SW] Activated and claimed clients');
        })()
    );
});

/**
 * Strict version mode: Ensure we're serving from the latest version
 * by checking the manifest before serving navigation requests.
 */
async function ensureLatestVersion() {
    const manifest = await fetchManifest();
    if (!manifest) {
        // Offline - use existing cache
        return currentCacheName;
    }

    const targetCacheName = CONFIG.cachePrefix + manifest.version;

    // Already have this version cached?
    if (currentCacheName === targetCacheName) {
        return currentCacheName;
    }

    // Check if target cache exists and is complete
    const cacheNames = await caches.keys();
    if (cacheNames.includes(targetCacheName)) {
        const isComplete = await verifyCacheIntegrity(targetCacheName, manifest);
        if (isComplete) {
            currentCacheName = targetCacheName;
            currentVersion = manifest.version;
            // Schedule cleanup of old caches (don't block)
            cleanupOldCaches(targetCacheName);
            return targetCacheName;
        }
    }

    // Need to cache new version - do it now (blocking)
    const newCacheName = await cacheManifestFiles(manifest);
    if (newCacheName) {
        currentCacheName = newCacheName;
        currentVersion = manifest.version;
        cleanupOldCaches(newCacheName);
        return newCacheName;
    }

    // Caching failed, fall back to existing
    return currentCacheName;
}

/**
 * Fetch event - cache-first for static assets
 */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip configured paths (APIs, streams, etc.)
    for (const skipPath of CONFIG.skipPaths) {
        if (url.pathname.startsWith(skipPath)) {
            return;
        }
    }

    // Skip cross-origin requests
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        (async () => {
            let cacheName = currentCacheName;

            // Strict version mode: For navigation requests, ensure we have latest version
            // This adds latency but guarantees newest version on single reload
            if (CONFIG.strictVersionMode && event.request.mode === 'navigate') {
                cacheName = await ensureLatestVersion();
            }

            // Get current cache if not set
            if (!cacheName) {
                const found = await findCurrentCache();
                cacheName = found.cacheName;
                currentCacheName = cacheName;
                currentVersion = found.version;
            }

            // Try cache first
            if (cacheName) {
                const cache = await caches.open(cacheName);

                let cachedResponse = await cache.match(event.request);
                if (!cachedResponse) {
                    cachedResponse = await cache.match(url.pathname);
                }
                if (!cachedResponse) {
                    cachedResponse = await cache.match(url.href);
                }

                if (cachedResponse) {
                    // In strict mode, schedule background cache update after serving
                    // (for non-navigation requests that may have been missed)
                    if (CONFIG.strictVersionMode && event.request.mode !== 'navigate') {
                        // Don't await - let it run in background
                        ensureLatestVersion().catch(() => {});
                    }
                    return cachedResponse;
                }
            }

            // Fall back to network
            try {
                const networkResponse = await fetch(event.request, { cache: 'no-store' });

                // Opportunistically cache static files
                if (networkResponse.ok && cacheName) {
                    const pathname = url.pathname;
                    if (/\.(js|html|css|json|svg|png|jpg|woff2?)$/.test(pathname)) {
                        const cache = await caches.open(cacheName);
                        cache.put(event.request, networkResponse.clone());
                    }
                }

                return networkResponse;
            } catch (error) {
                console.error('[SW] Network error for:', url.pathname, error.message);

                // For navigation, return cached index
                if (event.request.mode === 'navigate' && cacheName) {
                    const cache = await caches.open(cacheName);
                    const indexResponse = await cache.match(CONFIG.indexPage);
                    if (indexResponse) {
                        return indexResponse;
                    }
                }

                return new Response('Offline - resource not cached: ' + url.pathname, {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            }
        })()
    );
});

/**
 * Message event - handle commands from clients
 */
self.addEventListener('message', (event) => {
    const { type } = event.data || {};

    switch (type) {
        case 'check-cache':
            event.waitUntil(
                (async () => {
                    if (!currentCacheName) {
                        const found = await findCurrentCache();
                        currentCacheName = found.cacheName;
                        currentVersion = found.version;
                    }

                    if (!currentCacheName) {
                        event.source.postMessage({
                            type: 'cache-status',
                            status: 'checking',
                            version: null,
                            fileCount: 0
                        });
                        return;
                    }

                    const cache = await caches.open(currentCacheName);
                    const keys = await cache.keys();

                    event.source.postMessage({
                        type: 'cache-status',
                        status: keys.length < 5 ? 'incomplete' : 'ready',
                        version: currentVersion,
                        fileCount: keys.length
                    });
                })()
            );
            break;

        case 'update-cache':
            event.waitUntil(updateCacheIfNeeded());
            break;

        case 'clear-cache':
            event.waitUntil(
                (async () => {
                    const cacheNames = await caches.keys();
                    for (const name of cacheNames) {
                        if (name.startsWith(CONFIG.cachePrefix)) {
                            await caches.delete(name);
                        }
                    }
                    currentCacheName = null;
                    currentVersion = null;
                    event.source.postMessage({
                        type: 'cache-status',
                        status: 'checking'
                    });
                })()
            );
            break;

        case 'debug-cache':
            event.waitUntil(
                (async () => {
                    const cacheNames = await caches.keys();
                    const appCaches = cacheNames.filter(n => n.startsWith(CONFIG.cachePrefix));

                    const result = {
                        type: 'cache-debug',
                        currentCacheName,
                        currentVersion,
                        allCaches: []
                    };

                    for (const name of appCaches) {
                        const cache = await caches.open(name);
                        const keys = await cache.keys();
                        result.allCaches.push({
                            name,
                            count: keys.length,
                            urls: keys.map(req => req.url)
                        });
                    }

                    event.source.postMessage(result);
                })()
            );
            break;

        case 'skip-waiting':
            self.skipWaiting();
            break;
    }
});
