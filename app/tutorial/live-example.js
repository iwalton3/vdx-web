/**
 * tut-live-example - a multi-file, tabbed, editable example with live preview.
 *
 * An example is a directory of real files (a component, maybe a store, and an
 * `index.html` usage page). Each file is a tab you can edit; the preview runs
 * the whole project together in a sandboxed iframe.
 *
 * How the project is assembled for the preview:
 *   - Each .js file becomes a Blob URL. Peer imports (`./store.js`) are rewritten
 *     to bare specifiers (`store.js`) so they resolve from any module regardless
 *     of base URL. An import map maps each bare filename to its Blob URL and maps
 *     the `vdx/` prefix to the app origin, so `import 'vdx/lib/framework.js'`
 *     works - the same specifier a real static site would use.
 *   - The `index.html` file is the document, exactly as a static site would ship
 *     it. We only inject an import map, the theme stylesheet and an error catcher
 *     into its <head>.
 *   - Rebuilding srcdoc per run gives each run a fresh customElements registry -
 *     required, since defineComponent registers globally and keeps the first
 *     definition for a tag (component.js).
 *
 * Props:
 *   base       - directory the files live in, e.g. "/tutorial/examples/counter"
 *   files      - ordered array of filenames (tabs), e.g. ["App.js", "index.html"]
 *   entry      - the HTML entry filename (default: the first *.html in files)
 *   activeFile - filename to open first (default: files[0])
 *   title      - optional heading above the cell
 *   previewLabel - label above the preview pane (default "Result")
 */
import { defineComponent, html, when, each, Component } from '../lib/framework.js';
import '../componentlib/form/code-editor.js';
import '../componentlib/button/button.js';

const RUN_DEBOUNCE_MS = 550;

export class TutLiveExample extends Component {
    static props = {
        base: '',
        files: null,
        entry: '',
        activeFile: '',
        title: '',
        previewLabel: 'Result'
    }

    constructor(props) {
        super(props);
        this.state = { fileNames: [], active: '', loading: true };
        this._code = {};        // name -> current source (non-reactive)
        this._original = {};    // name -> pristine source
        this._timer = null;
        this._blobUrls = [];
    }

    mounted() {
        this._frame = this.refs.frame;
        this._editor = this.refs.editor;
        this._dark = document.body.classList.contains('dark');
        this._themeObserver = new MutationObserver(() => {
            const dark = document.body.classList.contains('dark');
            if (dark !== this._dark) { this._dark = dark; this.run(); }
        });
        this._themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        this._load();
    }

    unmounted() {
        if (this._timer) clearTimeout(this._timer);
        if (this._themeObserver) this._themeObserver.disconnect();
        this._revokeBlobs();
    }

    _fileUrl(name) {
        const base = (this.props.base || '').replace(/\/$/, '');
        return base ? `${base}/${name}` : name;
    }

    _fileList() {
        const f = this.props.files;
        if (Array.isArray(f)) return f.slice();
        if (typeof f === 'string' && f.trim()) return f.trim().split(/[\s,]+/);
        return [];
    }

    _load() {
        const names = this._fileList();
        if (!names.length) { this.state.loading = false; return; }
        Promise.all(names.map((name) =>
            fetch(this._fileUrl(name))
                .then((r) => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.text(); })
                .then((text) => ({ name, code: text.replace(/\s+$/, '\n') }))
                .catch((err) => ({ name, code: `// Failed to load ${name}\n// ${err.message}\n` }))
        )).then((loaded) => {
            for (const { name, code } of loaded) { this._code[name] = code; this._original[name] = code; }
            const active = this.props.activeFile && names.includes(this.props.activeFile)
                ? this.props.activeFile : names[0];
            this.state.fileNames = names.slice();
            this.state.active = active;
            this.state.loading = false;
            if (this._editor) this._editor.value = this._code[active] || '';
            this.run();
        });
    }

    selectFile(name) {
        if (name === this.state.active) return;
        this.state.active = name;
        if (this._editor) this._editor.value = this._code[name] || '';
    }

    handleEdit(e, value) {
        this._code[this.state.active] = value == null ? '' : String(value);
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => this.run(), RUN_DEBOUNCE_MS);
    }

    runNow() {
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        this.run();
    }

    reset() {
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        for (const name of this.state.fileNames) this._code[name] = this._original[name];
        if (this._editor) this._editor.value = this._code[this.state.active] || '';
        this.run();
    }

    run() {
        if (!this._frame || !this.state.fileNames.length) return;
        this._frame.srcdoc = this._compose();
    }

    _revokeBlobs() {
        for (const url of this._blobUrls) URL.revokeObjectURL(url);
        this._blobUrls = [];
    }

    _compose() {
        // Blobs from the previous run have already loaded; free them now.
        this._revokeBlobs();

        const names = this.state.fileNames;
        const origin = window.location.origin;
        const dark = document.body.classList.contains('dark');
        const jsNames = names.filter((n) => n.endsWith('.js'));
        const entryName = this.props.entry
            || names.find((n) => n.endsWith('.html'))
            || 'index.html';

        // Rewrite peer imports (./store.js | store.js | /store.js) whose basename
        // is another project file into a bare specifier the import map resolves.
        const rewrite = (code) => code.replace(
            /(\bfrom\s*|\bimport\s*)(['"])(?:\.{0,2}\/)?([\w-]+\.js)\2/g,
            (m, kw, q, base) => (jsNames.includes(base) ? `${kw}${q}${base}${q}` : m)
        );

        const imports = { 'vdx/': `${origin}/` };
        for (const name of jsNames) {
            const url = URL.createObjectURL(new Blob([rewrite(this._code[name] || '')], { type: 'text/javascript' }));
            imports[name] = url;
            this._blobUrls.push(url);
        }

        const inject = `<base href="${origin}/">
<link rel="stylesheet" href="/styles/theme.css">
<script type="importmap">${JSON.stringify({ imports })}<\/script>
<style>
  html, body { margin: 0; }
  body { padding: 16px; }
  #__err {
    margin-top: 12px; padding: 10px 12px; border-radius: 6px; display: none;
    background: var(--error-bg, #ffe7e7); color: var(--error-text, #b71c1c);
    border: 1px solid var(--error-color, #f5b5b5);
    font-family: ui-monospace, monospace; font-size: 12px; white-space: pre-wrap;
  }
</style>
<script>
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

        return this._assembleDoc(rewrite(this._code[entryName] || ''), inject, dark);
    }

    /** Splice the injected head content and dark class into the entry HTML. */
    _assembleDoc(entryHtml, inject, dark) {
        let out = entryHtml;
        if (/<head[^>]*>/i.test(out)) {
            out = out.replace(/<head[^>]*>/i, (m) => `${m}\n${inject}`);
        } else if (/<html[^>]*>/i.test(out)) {
            out = out.replace(/<html[^>]*>/i, (m) => `${m}\n<head>\n${inject}\n</head>`);
        } else {
            out = `<!DOCTYPE html><html><head>\n${inject}\n</head><body${dark ? ' class="dark"' : ''}>\n${out}\n</body></html>`;
            return out;
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

    template() {
        return html`
            <div class="tut-live">
                ${when(this.props.title, html`<h3 class="tut-live-title">${this.props.title}</h3>`)}
                <div class="tut-live-grid">
                    <div class="tut-pane tut-pane-code">
                        <div class="tut-tabbar" role="tablist">
                            <div class="tut-tabs">
                                ${each(this.state.fileNames, (name) => html`
                                    <button type="button" role="tab"
                                        class="tut-tab ${name === this.state.active ? 'active' : ''}"
                                        aria-selected="${name === this.state.active ? 'true' : 'false'}"
                                        on-click="${() => this.selectFile(name)}">
                                        ${name}
                                    </button>
                                `)}
                            </div>
                            <div class="tut-actions">
                                <cl-button label="Run" icon="▶" severity="primary" text="true" on-click="runNow"></cl-button>
                                <cl-button label="Reset" severity="secondary" text="true" on-click="reset"></cl-button>
                            </div>
                        </div>
                        <cl-code-editor ref="editor" height="360px"
                            on-change="${(e, v) => this.handleEdit(e, v)}"></cl-code-editor>
                    </div>
                    <div class="tut-pane tut-pane-preview">
                        <div class="tut-pane-head"><span class="tut-pane-label">${this.props.previewLabel}</span></div>
                        <iframe ref="frame" class="tut-frame" title="Live preview"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>
                    </div>
                </div>
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: block; margin: 24px 0; }

        .tut-live {
            border: 1px solid var(--border-color, #e1e4e8);
            border-radius: 10px;
            overflow: hidden;
            background: var(--card-bg, #fff);
        }

        .tut-live-title {
            margin: 0;
            padding: 12px 16px;
            font-size: 15px;
            border-bottom: 1px solid var(--border-color, #e1e4e8);
            background: var(--hover-bg, #f6f8fa);
        }

        .tut-live-grid { display: grid; grid-template-columns: 1fr 1fr; }
        @media (max-width: 820px) { .tut-live-grid { grid-template-columns: 1fr; } }

        .tut-pane { min-width: 0; display: flex; flex-direction: column; }
        .tut-pane-code { border-right: 1px solid var(--border-color, #e1e4e8); }
        @media (max-width: 820px) {
            .tut-pane-code { border-right: 0; border-bottom: 1px solid var(--border-color, #e1e4e8); }
        }

        .tut-tabbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 4px 8px 0 8px;
            background: var(--hover-bg, #f6f8fa);
            border-bottom: 1px solid var(--border-color, #e1e4e8);
        }

        .tut-tabs { display: flex; gap: 2px; overflow-x: auto; }

        .tut-tab {
            font: inherit;
            font-size: 12.5px;
            font-family: ui-monospace, Menlo, Consolas, monospace;
            white-space: nowrap;
            cursor: pointer;
            padding: 8px 12px;
            border: none;
            border-bottom: 2px solid transparent;
            background: transparent;
            color: var(--text-secondary, #57606a);
        }
        .tut-tab:hover { color: var(--text-color, #24292e); }
        .tut-tab.active {
            color: var(--primary-color, #0969da);
            border-bottom-color: var(--primary-color, #0969da);
        }

        .tut-actions { display: flex; gap: 4px; flex-shrink: 0; }

        .tut-pane-code cl-code-editor { flex: 1; }
        .tut-pane-code .cl-code-editor { border: 0; border-radius: 0; }

        .tut-pane-head {
            display: flex;
            align-items: center;
            padding: 0 12px;
            min-height: 41px;
            background: var(--hover-bg, #f6f8fa);
            border-bottom: 1px solid var(--border-color, #e1e4e8);
        }

        .tut-pane-label {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--text-muted, #6c757d);
        }

        .tut-frame {
            flex: 1;
            width: 100%;
            min-height: 380px;
            border: 0;
            background: var(--ce-bg, #fff);
        }
    `
}

export default defineComponent('tut-live-example', TutLiveExample);
