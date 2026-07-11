# Offline & PWA (no bundler)

VDX ships two small, dependency-free pieces that give a vendored site the cache
coherency you'd normally get from a bundler — an atomic, versioned offline cache —
**without changing your source or adding a build step**:

| Piece | Path | Role |
|-------|------|------|
| Service worker template | [`pwa/sw.js`](../pwa/sw.js) | Versioned, atomic-update offline cache. Copy into your project and configure. |
| Manifest generator | [`tools/spider-deps.js`](../tools/spider-deps.js) | Walks your entry HTML's import graph and writes `cache-manifest.json`. |

A complete working example lives in
[`site/embedding/pwa-offline/`](../site/embedding/pwa-offline/) (linked from the
[embedding page](https://vdx-web.github.io/site/embedding/)).

## Why this exists

The classic offline footgun is **version skew**: a user loads `index.html` from
an old cache but `app.js` from the network (or vice-versa), and the mismatched
files break at runtime. Bundlers solve this by content-hashing everything into
one atomic build. VDX has no bundler, so `sw.js` + `spider-deps.js` reproduce the
same guarantee: every file is content-hashed into a single **version**, and the
service worker only ever serves files from one fully-populated, version-matched
cache.

## 1. Generate the cache manifest

`spider-deps.js` starts from your entry HTML, follows every `<script>` and
`import`, content-hashes the whole set into a version string, and writes a
`cache-manifest.json`:

```bash
# node tools/spider-deps.js [appDir] [webRoot]
#   appDir  - directory containing the entry index.html
#   webRoot - your served document root (URLs are computed relative to it)
node tools/spider-deps.js path/to/app .
```

Output (`path/to/app/cache-manifest.json`):

```json
{
  "version": "e0204bef",
  "fileCount": 5,
  "files": ["/dist/framework.js", "/app/index.html", "/app/main.js", ...]
}
```

Re-run it whenever files change (e.g. as a pre-deploy step); a changed file
yields a new `version`, which the service worker uses to roll the cache.

## 2. Add the service worker

Copy [`pwa/sw.js`](../pwa/sw.js) to your app's root (so its scope covers your
pages) and edit the `CONFIG` block at the top:

```javascript
const CONFIG = {
    cachePrefix: 'my-app-v',                 // cache name; version is appended
    manifestUrl: './cache-manifest.json',    // what spider-deps wrote
    indexPage: '/index.html',                // navigation fallback when offline
    strictVersionMode: false                 // true = webpack-like freshness on one reload
};
```

Then register it from your page:

```html
<script type="module">
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
  }
</script>
```

**Service-worker scope matters:** a worker only controls pages under its own
path, so serve `sw.js` from your app root (that's why the bundled demo keeps its
own copy at `site/embedding/pwa-offline/sw.js` rather than importing a shared one).

## How the worker behaves

- **Versioned caches** — each manifest `version` gets its own cache
  (`my-app-v<version>`); the active version is only swapped in once the new cache
  is fully populated (atomic update).
- **Integrity** — the content hash guarantees every cached file belongs to the
  same version; you never serve a mismatched set.
- **Cleanup** — old version caches are deleted after a successful update.
- **Offline fallback** — navigations fall back to the cached `indexPage`.
- **Progress** — the worker posts messages to clients during caching (see the
  demo's `index.html` for the message protocol).

## See also

- [bundles.md](bundles.md) — the pre-built `dist/` files this caches.
- [optimization.md](optimization.md) — the build-time optimizer, the other
  optional production step.
