/**
 * tut-live-example - an editable code cell with a live preview.
 *
 * Pairs a <cl-code-editor> with a sandboxed <iframe>. On every (debounced) edit
 * the iframe is rebuilt from scratch via srcdoc, which gives each run a fresh
 * document and - crucially - a fresh customElements registry. That isolation is
 * required, not cosmetic: defineComponent() registers globally and silently
 * keeps the FIRST definition for a tag name, so an edited component could never
 * replace its previous version in a shared document (see component.js).
 *
 * The editor value and the iframe are both driven imperatively so typing never
 * triggers a reactive re-render of the preview.
 *
 * Props:
 *   code   - initial editor source (a module that imports from /lib/framework.js)
 *   src    - URL to fetch initial source from (alternative to `code`; keeps
 *            examples as real, runnable .js files)
 *   mount  - HTML placed in the preview body (e.g. "<my-counter></my-counter>")
 *   title  - optional heading shown above the cell
 *   preview-label - optional label above the preview pane
 */
import { defineComponent, html, when, Component } from '../lib/framework.js';
import '../componentlib/form/code-editor.js';
import '../componentlib/button/button.js';

const RUN_DEBOUNCE_MS = 600;

export class TutLiveExample extends Component {
    static props = {
        code: '',
        src: '',
        mount: '',
        title: '',
        previewLabel: 'Result'
    }

    constructor(props) {
        super(props);
        this._original = props.code || '';
        this._code = this._original;
        this._timer = null;
    }

    mounted() {
        this._frame = this.refs.frame;
        // Rebuild the preview when the page theme flips so it matches the shell.
        this._dark = document.body.classList.contains('dark');
        this._themeObserver = new MutationObserver(() => {
            const dark = document.body.classList.contains('dark');
            if (dark !== this._dark) { this._dark = dark; this.run(); }
        });
        this._themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        if (this.props.src) {
            fetch(this.props.src)
                .then((r) => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.text(); })
                .then((text) => this._setSource(text.replace(/\s+$/, '\n')))
                .catch((err) => this._setSource(`// Failed to load ${this.props.src}\n// ${err.message}`));
        } else {
            this.run();
        }
    }

    _setSource(text) {
        this._original = text;
        this._code = text;
        if (this.refs.editor) this.refs.editor.value = text;
        this.run();
    }

    unmounted() {
        if (this._timer) clearTimeout(this._timer);
        if (this._themeObserver) this._themeObserver.disconnect();
    }

    handleEdit(e, value) {
        this._code = value == null ? '' : String(value);
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => this.run(), RUN_DEBOUNCE_MS);
    }

    runNow() {
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        this.run();
    }

    reset() {
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        this._code = this._original;
        if (this.refs.editor) this.refs.editor.value = this._original;
        this.run();
    }

    run() {
        if (this._frame) this._frame.srcdoc = this._buildDoc(this._code);
    }

    _buildDoc(code) {
        // Neutralise any literal </script> so the module script can't be closed early.
        const safeCode = String(code).replace(/<\/script/gi, '<\\/script');
        const origin = window.location.origin;
        const dark = document.body.classList.contains('dark');
        return `<!DOCTYPE html>
<html${dark ? ' data-dark="1"' : ''}>
<head>
<meta charset="utf-8">
<base href="${origin}/">
<link rel="stylesheet" href="/styles/theme.css">
<style>
  html, body { margin: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; }
  #__err {
    display: none; margin-top: 12px; padding: 10px 12px; border-radius: 6px;
    background: #4a2020; color: #ffb4b4; font-family: ui-monospace, monospace;
    font-size: 12px; white-space: pre-wrap; border: 1px solid #7a3030;
  }
  body:not(.dark) #__err { background: #ffe7e7; color: #b71c1c; border-color: #f5b5b5; }
</style>
</head>
<body class="${dark ? 'dark' : ''}">
<div id="__app">${this.props.mount || ''}</div>
<div id="__err"></div>
<script>
  (function () {
    function show(msg) {
      var el = document.getElementById('__err');
      if (!el) return;
      el.style.display = 'block';
      el.textContent = '⚠ ' + msg;
    }
    window.addEventListener('error', function (e) {
      show(e.message + (e.filename ? '\\n  ' + e.filename + ':' + e.lineno : ''));
    });
    window.addEventListener('unhandledrejection', function (e) {
      var r = e.reason;
      show((r && (r.stack || r.message)) || String(r));
    });
  })();
</script>
<script type="module">
${safeCode}
</script>
</body>
</html>`;
    }

    template() {
        return html`
            <div class="tut-live">
                ${when(this.props.title, html`<h3 class="tut-live-title">${this.props.title}</h3>`)}
                <div class="tut-live-grid">
                    <div class="tut-pane tut-pane-code">
                        <div class="tut-pane-head">
                            <span class="tut-pane-label">Code</span>
                            <div class="tut-actions">
                                <cl-button label="Run" icon="▶" severity="primary" text="true"
                                    on-click="runNow"></cl-button>
                                <cl-button label="Reset" severity="secondary" text="true"
                                    on-click="reset"></cl-button>
                            </div>
                        </div>
                        <cl-code-editor
                            ref="editor"
                            value="${this.props.code}"
                            height="320px"
                            on-change="${(e, v) => this.handleEdit(e, v)}">
                        </cl-code-editor>
                    </div>
                    <div class="tut-pane tut-pane-preview">
                        <div class="tut-pane-head">
                            <span class="tut-pane-label">${this.props.previewLabel}</span>
                        </div>
                        <iframe ref="frame" class="tut-frame" title="Live preview"
                            sandbox="allow-scripts allow-same-origin"></iframe>
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

        .tut-live-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
        }

        @media (max-width: 780px) {
            .tut-live-grid { grid-template-columns: 1fr; }
        }

        .tut-pane { min-width: 0; display: flex; flex-direction: column; }
        .tut-pane-code { border-right: 1px solid var(--border-color, #e1e4e8); }

        @media (max-width: 780px) {
            .tut-pane-code { border-right: 0; border-bottom: 1px solid var(--border-color, #e1e4e8); }
        }

        .tut-pane-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 10px 6px 14px;
            min-height: 40px;
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

        .tut-actions { display: flex; gap: 4px; }

        .tut-pane-code cl-code-editor { flex: 1; }
        .tut-pane-code .cl-code-editor { border: 0; border-radius: 0; }

        .tut-frame {
            flex: 1;
            width: 100%;
            min-height: 360px;
            border: 0;
            background: var(--ce-bg, #fff);
        }
    `
}

export default defineComponent('tut-live-example', TutLiveExample);
