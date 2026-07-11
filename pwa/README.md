# pwa/ — offline / service-worker template

Reusable pieces for turning a vendored VDX site into an offline-capable PWA,
**without a bundler**. Copy `sw.js` into your project and generate a manifest
with the spider tool.

- **`sw.js`** — a generic, versioned, atomic-update service worker. Edit the
  `CONFIG` block at the top (cache prefix, `indexPage` offline fallback,
  `strictVersionMode`) and serve it from your app's root so its scope covers
  your pages.
- **`../tools/spider-deps.js`** — walks your entry HTML's script/import graph,
  content-hashes every file into a version string, and writes
  `cache-manifest.json` (the precache list `sw.js` reads).

See **[../docs/pwa.md](../docs/pwa.md)** for the full walkthrough. A working
example lives in [`../site/embedding/pwa-offline/`](../site/embedding/pwa-offline/).
