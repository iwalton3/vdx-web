/**
 * ClCodeRunner - an editable, tabbed, multi-file VDX project with a live preview.
 *
 * Give it a set of files (a component, maybe a store, and an index.html usage
 * page); it shows each as a tab you can edit and runs the whole project in a
 * sandboxed iframe (see ./vdx-sandbox.js). Rebuilding the preview per run gives
 * a fresh customElements registry, so edited components re-register cleanly.
 *
 * Props:
 *   files      - map { "App.js": "...", "index.html": "..." } or [{name, code}]
 *                (also accepts a JSON string, for use from static HTML)
 *   entry      - HTML entry filename (default: first *.html)
 *   activeFile - filename to open first (default: first file)
 *   previewLabel - label above the preview pane (default "Result")
 *   height     - editor height (default "360px")
 *   persistKey - if set, edits are saved to localStorage under this key
 *
 * @fires change - detail: { files } - fired (debounced) after an edit
 */
import { defineComponent, html, when, each, Component } from '../../lib/framework.js';
import { buildSandbox, normalizeFiles } from './vdx-sandbox.js';
import '../form/code-editor.js';
import '../button/button.js';

const RUN_DEBOUNCE_MS = 550;

export class ClCodeRunner extends Component {
    static props = {
        files: null,
        entry: '',
        activeFile: '',
        previewLabel: 'Result',
        height: '360px',
        persistKey: ''
    }

    constructor(props) {
        super(props);
        this.state = { fileNames: [], active: '' };
        this._code = {};
        this._original = {};
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
        this._init(this.props.files);
    }

    unmounted() {
        if (this._timer) clearTimeout(this._timer);
        if (this._themeObserver) this._themeObserver.disconnect();
        this._revokeBlobs();
    }

    propsChanged(prop, newValue) {
        if (prop === 'files' && this._frame) this._init(newValue);
    }

    _parseFiles(files) {
        if (typeof files === 'string') {
            const s = files.trim();
            if (s.startsWith('{') || s.startsWith('[')) {
                try { return normalizeFiles(JSON.parse(s)); } catch (e) { /* fall through */ }
            }
            return {};
        }
        return normalizeFiles(files);
    }

    _init(files) {
        const map = this._parseFiles(files);
        const names = Object.keys(map);
        this._original = { ...map };
        this._code = { ...map };
        // Restore persisted edits (same file set only).
        if (this.props.persistKey) {
            const saved = this._loadPersisted();
            if (saved) for (const n of names) if (n in saved) this._code[n] = saved[n];
        }
        const active = this.props.activeFile && names.includes(this.props.activeFile)
            ? this.props.activeFile : names[0] || '';
        this.state.fileNames = names;
        this.state.active = active;
        if (this._editor) this._editor.value = this._code[active] || '';
        this.run();
    }

    selectFile(name) {
        if (name === this.state.active) return;
        this.state.active = name;
        if (this._editor) this._editor.value = this._code[name] || '';
    }

    handleEdit(e, value) {
        this._code[this.state.active] = value == null ? '' : String(value);
        this._persist();
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => {
            this.run();
            this.dispatchEvent(new CustomEvent('change', { detail: { files: { ...this._code } }, bubbles: true }));
        }, RUN_DEBOUNCE_MS);
    }

    runNow() {
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        this.run();
    }

    reset() {
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        this._code = { ...this._original };
        if (this.props.persistKey) { try { localStorage.removeItem(this.props.persistKey); } catch (e) {} }
        if (this._editor) this._editor.value = this._code[this.state.active] || '';
        this.run();
    }

    run() {
        if (!this._frame || !this.state.fileNames.length) return;
        this._revokeBlobs();
        const { doc, blobUrls } = buildSandbox(this._code, this.props.entry, {
            dark: document.body.classList.contains('dark')
        });
        this._blobUrls = blobUrls;
        const docUrl = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
        this._blobUrls.push(docUrl);
        this._frame.src = docUrl;
    }

    _revokeBlobs() {
        for (const url of this._blobUrls) URL.revokeObjectURL(url);
        this._blobUrls = [];
    }

    _persist() {
        if (!this.props.persistKey) return;
        try { localStorage.setItem(this.props.persistKey, JSON.stringify(this._code)); } catch (e) {}
    }

    _loadPersisted() {
        try {
            const raw = localStorage.getItem(this.props.persistKey);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    template() {
        return html`
            <div class="cl-runner">
                <div class="cl-runner-grid">
                    <div class="cl-pane cl-pane-code">
                        <div class="cl-tabbar" role="tablist">
                            <div class="cl-tabs">
                                ${each(this.state.fileNames, (name) => html`
                                    <button type="button" role="tab"
                                        class="cl-tab ${name === this.state.active ? 'active' : ''}"
                                        aria-selected="${name === this.state.active ? 'true' : 'false'}"
                                        on-click="${() => this.selectFile(name)}">${name}</button>
                                `)}
                            </div>
                            <div class="cl-actions">
                                <cl-button label="Run" icon="▶" severity="primary" text="true" on-click="runNow"></cl-button>
                                <cl-button label="Reset" severity="secondary" text="true" on-click="reset"></cl-button>
                            </div>
                        </div>
                        <cl-code-editor ref="editor" height="${this.props.height}"
                            on-change="${(e, v) => this.handleEdit(e, v)}"></cl-code-editor>
                    </div>
                    <div class="cl-pane cl-pane-preview">
                        <div class="cl-pane-head"><span class="cl-pane-label">${this.props.previewLabel}</span></div>
                        <iframe ref="frame" class="cl-frame" title="Live preview"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"></iframe>
                    </div>
                </div>
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: block; }

        .cl-runner {
            border: 1px solid var(--border-color, #e1e4e8);
            border-radius: 10px;
            overflow: hidden;
            background: var(--card-bg, #fff);
            height: 100%;
        }

        .cl-runner-grid { display: grid; grid-template-columns: 1fr 1fr; height: 100%; }
        @media (max-width: 820px) { .cl-runner-grid { grid-template-columns: 1fr; } }

        .cl-pane { min-width: 0; display: flex; flex-direction: column; }
        .cl-pane-code { border-right: 1px solid var(--border-color, #e1e4e8); }
        @media (max-width: 820px) {
            .cl-pane-code { border-right: 0; border-bottom: 1px solid var(--border-color, #e1e4e8); }
        }

        .cl-tabbar {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
            padding: 4px 8px 0 8px;
            background: var(--hover-bg, #f6f8fa);
            border-bottom: 1px solid var(--border-color, #e1e4e8);
        }
        .cl-tabs { display: flex; gap: 2px; overflow-x: auto; }
        .cl-tab {
            font: inherit; font-size: 12.5px;
            font-family: ui-monospace, Menlo, Consolas, monospace;
            white-space: nowrap; cursor: pointer;
            padding: 8px 12px; border: none; border-bottom: 2px solid transparent;
            background: transparent; color: var(--text-secondary, #57606a);
        }
        .cl-tab:hover { color: var(--text-color, #24292e); }
        .cl-tab.active { color: var(--primary-color, #0969da); border-bottom-color: var(--primary-color, #0969da); }

        .cl-actions { display: flex; gap: 4px; flex-shrink: 0; }

        .cl-pane-code cl-code-editor { flex: 1; }
        .cl-pane-code .cl-code-editor { border: 0; border-radius: 0; height: 100%; }

        .cl-pane-head {
            display: flex; align-items: center; padding: 0 12px; min-height: 41px;
            background: var(--hover-bg, #f6f8fa);
            border-bottom: 1px solid var(--border-color, #e1e4e8);
        }
        .cl-pane-label {
            font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
            color: var(--text-muted, #6c757d);
        }

        .cl-frame { flex: 1; width: 100%; min-height: 380px; border: 0; background: var(--ce-bg, #fff); }
    `
}

export default defineComponent('cl-code-runner', ClCodeRunner);
