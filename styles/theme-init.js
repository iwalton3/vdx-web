/*
 * Pre-paint theme init (anti-FOUC).
 * -------------------------------------------------------------------------
 * A tiny *blocking* classic script: include it as the first child of <body>
 * (`<script src="/styles/theme-init.js"></script>`) so the `dark` class lands
 * on <body> synchronously, before the page paints. Without it the module-based
 * theme sync in lib/utils.js only runs after modules load, causing a flash of
 * light on dark-preferring systems.
 *
 * This mirrors resolveDarkMode() + the localStorage shape in lib/utils.js -
 * keep the two in sync. (It can't import that module: module scripts are
 * deferred, which is exactly the delay we're avoiding here.)
 */
(function () {
    try {
        var mode = 'auto';
        var raw = window.localStorage.getItem('swapi_dark');
        if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed && (parsed.mode === 'auto' || parsed.mode === 'light' || parsed.mode === 'dark')) {
                mode = parsed.mode;
            } else if (parsed && typeof parsed.enabled === 'boolean') {
                mode = parsed.enabled ? 'dark' : 'auto'; // legacy { enabled }
            } else if (typeof parsed === 'boolean') {
                mode = parsed ? 'dark' : 'auto'; // legacy bare boolean
            }
        }
        var dark = mode === 'dark' || (mode === 'auto'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (dark && document.body) document.body.classList.add('dark');
    } catch (e) { /* localStorage/JSON may be unavailable; fall back to light */ }
})();
