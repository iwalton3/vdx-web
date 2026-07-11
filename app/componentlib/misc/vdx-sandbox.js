/**
 * vdx-sandbox - assemble a runnable VDX project into a single HTML document for
 * a preview iframe.
 *
 * Each .js file becomes a Blob URL; peer imports (`./store.js`) are rewritten to
 * bare specifiers (`store.js`) so they resolve from any module regardless of
 * base URL. An import map maps each bare filename to its Blob URL and maps the
 * `vdx/` prefix to the app origin, so `import 'vdx/lib/framework.js'` (and
 * `import 'vdx/componentlib/all.js'`) resolve to the real files. The chosen
 * HTML file is the document; we only inject the import map, the theme stylesheet
 * and an error catcher.
 *
 * Load the returned doc from a Blob-URL document (not srcdoc): a real
 * same-origin URL keeps in-page hash links in the document so the framework
 * router works, and omitting <base> keeps the router in hash mode.
 *
 * @module componentlib/misc/vdx-sandbox
 */

/** Normalise a files input (object map or array of {name,code}) to a map. */
export function normalizeFiles(files) {
    const out = {};
    if (!files) return out;
    if (Array.isArray(files)) {
        for (const f of files) if (f && f.name) out[f.name] = f.code == null ? '' : String(f.code);
    } else if (typeof files === 'object') {
        for (const [name, code] of Object.entries(files)) out[name] = code == null ? '' : String(code);
    }
    return out;
}

const ERROR_SCRIPT = `<script>
  (function () {
    function show(msg) {
      var el = document.getElementById('__err');
      if (!el) { el = document.createElement('div'); el.id = '__err'; document.body.appendChild(el); }
      el.style.display = 'block';
      el.textContent = '⚠ ' + msg;
    }
    addEventListener('error', function (e) { show(e.message + (e.filename ? '\\n  ' + e.filename + (e.lineno ? ':' + e.lineno : '') : '')); });
    addEventListener('unhandledrejection', function (e) { var r = e.reason; show((r && (r.stack || r.message)) || String(r)); });
  })();
<\/script>
<div id="__err"></div>`;

const ERROR_STYLE = `<style>
  html, body { margin: 0; }
  body { padding: 16px; }
  #__err {
    margin-top: 12px; padding: 10px 12px; border-radius: 6px; display: none;
    background: var(--error-bg, #ffe7e7); color: var(--error-text, #b71c1c);
    border: 1px solid var(--error-color, #f5b5b5);
    font-family: ui-monospace, monospace; font-size: 12px; white-space: pre-wrap;
  }
</style>`;

/**
 * Build a preview document from a set of project files.
 *
 * @param {Object|Array} files - map of filename -> source, or [{name, code}]
 * @param {string} [entry] - HTML entry filename (default: first *.html)
 * @param {{origin?: string, dark?: boolean}} [opts]
 * @returns {{ doc: string, blobUrls: string[] }} - the document HTML and the
 *   Blob URLs it references (revoke them once the next build replaces it).
 */
export function buildSandbox(files, entry, opts = {}) {
    const map = normalizeFiles(files);
    const names = Object.keys(map);
    const origin = opts.origin || (typeof window !== 'undefined' ? window.location.origin : '');
    const dark = !!opts.dark;
    const jsNames = names.filter((n) => n.endsWith('.js'));
    const entryName = entry || names.find((n) => n.endsWith('.html')) || 'index.html';

    // Rewrite peer imports (./store.js | store.js | /store.js) whose basename is
    // another project file into a bare specifier the import map resolves.
    const rewrite = (code) => String(code).replace(
        /(\bfrom\s*|\bimport\s*)(['"])(?:\.{0,2}\/)?([\w-]+\.js)\2/g,
        (m, kw, q, base) => (jsNames.includes(base) ? `${kw}${q}${base}${q}` : m)
    );

    const blobUrls = [];
    const imports = { 'vdx/': `${origin}/` };
    for (const name of jsNames) {
        const url = URL.createObjectURL(new Blob([rewrite(map[name] || '')], { type: 'text/javascript' }));
        imports[name] = url;
        blobUrls.push(url);
    }

    const inject = `<link rel="stylesheet" href="${origin}/styles/theme.css">
<script type="importmap">${JSON.stringify({ imports })}<\/script>
${ERROR_STYLE}
${ERROR_SCRIPT}`;

    const doc = assembleDoc(rewrite(map[entryName] || ''), inject, dark);
    return { doc, blobUrls };
}

/** Splice the injected head content and dark class into the entry HTML. */
function assembleDoc(entryHtml, inject, dark) {
    let out = entryHtml;
    if (/<head[^>]*>/i.test(out)) {
        out = out.replace(/<head[^>]*>/i, (m) => `${m}\n${inject}`);
    } else if (/<html[^>]*>/i.test(out)) {
        out = out.replace(/<html[^>]*>/i, (m) => `${m}\n<head>\n${inject}\n</head>`);
    } else {
        return `<!DOCTYPE html><html><head>\n${inject}\n</head><body${dark ? ' class="dark"' : ''}>\n${out}\n</body></html>`;
    }
    if (dark) {
        if (/<body[^>]*>/i.test(out)) {
            out = out.replace(/<body([^>]*)>/i, (m, attrs) =>
                /\bclass\s*=/.test(attrs)
                    ? m.replace(/class\s*=\s*(['"])/i, 'class=$1dark ')
                    : `<body class="dark"${attrs}>`);
        } else {
            out = out.replace(/(<\/head>)/i, `$1<body class="dark">`);
        }
    }
    return out;
}
