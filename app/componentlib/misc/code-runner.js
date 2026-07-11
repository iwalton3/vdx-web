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
        height: '320px',          // editor height (ignored when fill)
        previewHeight: '380px',   // preview pane height
        fill: false,              // fill the container height; editor flexes, preview stays previewHeight
        allowAddFiles: false,     // show + / × to add and remove files
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
        this._original = { ...map };
        let code = { ...map };
        let names = Object.keys(map);
        let active = this.props.activeFile && names.includes(this.props.activeFile)
            ? this.props.activeFile : names[0] || '';
        // Restore the persisted working set (may include added/removed files).
        if (this.props.persistKey) {
            const saved = this._loadPersisted();
            if (saved && saved.files && Object.keys(saved.files).length) {
                code = { ...saved.files };
                names = Object.keys(code);
                active = saved.active && names.includes(saved.active) ? saved.active : names[0] || '';
            }
        }
        this._code = code;
        this.state.fileNames = names;
        this.state.active = active;
        if (this._editor) this._editor.value = this._code[active] || '';
        this.run();
    }

    addFile() {
        const raw = window.prompt('New file name (e.g. utils.js):', '');
        if (!raw) return;
        const name = raw.trim();
        if (!/^[\w.-]+\.(js|html|css)$/i.test(name)) {
            window.alert('Please use a .js, .html or .css file name.');
            return;
        }
        if (name in this._code) { this.selectFile(name); return; }
        const lower = name.toLowerCase();
        const stub = lower.endsWith('.html')
            ? '<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n\n</body>\n</html>\n'
            : lower.endsWith('.css') ? `/* ${name} */\n` : `// ${name}\n`;
        this._code[name] = stub;
        this.state.fileNames = [...this.state.fileNames, name];
        this.state.active = name;
        if (this._editor) this._editor.value = stub;
        this._persist();
        this.run();
    }

    removeFile(name) {
        if (this.state.fileNames.length <= 1) return;
        delete this._code[name];
        this.state.fileNames = this.state.fileNames.filter((n) => n !== name);
        if (this.state.active === name) {
            this.state.active = this.state.fileNames[0];
            if (this._editor) this._editor.value = this._code[this.state.active] || '';
        }
        this._persist();
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
        this.state.fileNames = Object.keys(this._original);
        if (!this.state.fileNames.includes(this.state.active)) {
            this.state.active = this.state.fileNames[0] || '';
        }
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
        try {
            localStorage.setItem(this.props.persistKey,
                JSON.stringify({ files: this._code, active: this.state.active }));
        } catch (e) {}
    }

    _loadPersisted() {
        try {
            const raw = localStorage.getItem(this.props.persistKey);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    template() {
        const fill = this.props.fill && this.props.fill !== 'false';
        const allowAdd = this.props.allowAddFiles && this.props.allowAddFiles !== 'false';
        const removable = allowAdd && this.state.fileNames.length > 1;
        // In fill mode the editor grows via flex (no fixed height); the CSS below
        // stretches its internals. Otherwise it's a fixed-height box.
        const editorHeight = fill ? '' : (this.props.height || '320px');
        const previewStyle = `height: ${this.props.previewHeight || '380px'};`;
        return html`
            <div class="cl-runner ${fill ? 'fill' : ''}">
                <div class="cl-pane cl-pane-code">
                    <div class="cl-tabbar" role="tablist">
                        <div class="cl-tabs">
                            ${each(this.state.fileNames, (name) => html`
                                <div role="tab" tabindex="0"
                                    class="cl-tab ${name === this.state.active ? 'active' : ''}"
                                    aria-selected="${name === this.state.active ? 'true' : 'false'}"
                                    on-click="${() => this.selectFile(name)}"
                                    on-keydown="${(e) => e.key === 'Enter' && this.selectFile(name)}">
                                    <span class="cl-tab-name">${name}</span>
                                    ${when(removable, html`<span class="cl-tab-close" title="Remove file"
                                        on-click-stop="${() => this.removeFile(name)}">×</span>`)}
                                </div>
                            `)}
                            ${when(allowAdd, html`
                                <button type="button" class="cl-tab-add" title="Add file" on-click="addFile">+</button>
                            `)}
                        </div>
                        <div class="cl-actions">
                            <cl-button label="Run" icon="▶" severity="primary" text="true" on-click="runNow"></cl-button>
                            <cl-button label="Reset" severity="secondary" text="true" on-click="reset"></cl-button>
                        </div>
                    </div>
                    <cl-code-editor ref="editor" height="${editorHeight}"
                        on-change="${(e, v) => this.handleEdit(e, v)}"></cl-code-editor>
                </div>
                <div class="cl-pane cl-pane-preview">
                    <div class="cl-pane-head"><span class="cl-pane-label">${this.props.previewLabel}</span></div>
                    <iframe ref="frame" class="cl-frame" title="Live preview" style="${previewStyle}"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"></iframe>
                </div>
            </div>
        `;
    }

    static styles = /*css*/`
        /* Flex column all the way down so fill mode needs no percentage heights. */
        :host { display: flex; flex-direction: column; min-height: 0; }

        /* Stacked: editor on top, preview below (full-width code, less scrolling). */
        .cl-runner {
            display: flex;
            flex-direction: column;
            flex: 1 1 auto;
            min-height: 0;
            border: 1px solid var(--border-color, #e1e4e8);
            border-radius: 10px;
            overflow: hidden;
            background: var(--card-bg, #fff);
        }

        .cl-pane { min-width: 0; display: flex; flex-direction: column; }
        .cl-pane-code { border-bottom: 1px solid var(--border-color, #e1e4e8); }

        /* Fill mode: flex the editor (and its internals) so it grows to fill the
           space above the fixed-height preview - no percentage heights involved. */
        .cl-runner.fill .cl-pane-code { flex: 1 1 auto; min-height: 0; }
        .cl-runner.fill .cl-pane-code cl-code-editor,
        .cl-runner.fill .cl-pane-code .cl-code-editor-wrap {
            flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column;
        }
        .cl-runner.fill .cl-pane-code .cl-code-editor { flex: 1 1 auto; min-height: 0; }

        .cl-tabbar {
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
            padding: 4px 8px 0 8px;
            background: var(--hover-bg, #f6f8fa);
            border-bottom: 1px solid var(--border-color, #e1e4e8);
        }
        .cl-tabs { display: flex; align-items: stretch; gap: 2px; overflow-x: auto; }
        .cl-tab {
            display: inline-flex; align-items: center; gap: 6px;
            font: inherit; font-size: 12.5px;
            font-family: ui-monospace, Menlo, Consolas, monospace;
            white-space: nowrap; cursor: pointer;
            padding: 8px 12px; border-bottom: 2px solid transparent;
            background: transparent; color: var(--text-secondary, #57606a);
        }
        .cl-tab:hover { color: var(--text-color, #24292e); }
        .cl-tab:focus-visible { outline: 2px solid var(--primary-color, #0969da); outline-offset: -2px; }
        .cl-tab.active { color: var(--primary-color, #0969da); border-bottom-color: var(--primary-color, #0969da); }

        .cl-tab-close {
            font-size: 14px; line-height: 1; opacity: 0.5;
            padding: 0 2px; border-radius: 3px;
        }
        .cl-tab-close:hover { opacity: 1; background: rgba(127, 127, 127, 0.25); }

        .cl-tab-add {
            font: inherit; font-size: 16px; line-height: 1; cursor: pointer;
            padding: 4px 12px; border: none; border-bottom: 2px solid transparent;
            background: transparent; color: var(--text-muted, #6c757d);
        }
        .cl-tab-add:hover { color: var(--primary-color, #0969da); }

        .cl-actions { display: flex; gap: 4px; flex-shrink: 0; }

        .cl-pane-code cl-code-editor { display: block; }
        .cl-pane-code .cl-code-editor { border: 0; border-radius: 0; }

        .cl-pane-preview { border-top: 1px solid var(--border-color, #e1e4e8); }
        .cl-pane-head {
            display: flex; align-items: center; padding: 0 12px; min-height: 41px;
            background: var(--hover-bg, #f6f8fa);
            border-bottom: 1px solid var(--border-color, #e1e4e8);
        }
        .cl-pane-label {
            font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
            color: var(--text-muted, #6c757d);
        }

        .cl-frame { width: 100%; border: 0; background: var(--ce-bg, #fff); display: block; }
    `
}

export default defineComponent('cl-code-runner', ClCodeRunner);
